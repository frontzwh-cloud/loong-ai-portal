"""Small CAS -> Workflow -> Portal session -> downstream one-time code SSO.

State is deliberately process-local: one Portal worker only; restart logs users out.
"""
import asyncio
import os
import re
import secrets
import time
from urllib.parse import urlencode

import httpx
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import JSONResponse, RedirectResponse
from pydantic import BaseModel, Field

router = APIRouter()
_lock = asyncio.Lock()
_pending: dict[str, tuple[float, str]] = {}
_sessions: dict[str, tuple[float, dict]] = {}
_codes: dict[str, tuple[float, str, dict]] = {}
UID_RE = re.compile(r"^[A-Za-z0-9_.@-]{1,128}$")
SESSION_AGE = 8 * 3600
PENDING_AGE = 300
CODE_AGE = 60


def enabled() -> bool:
    return os.getenv("SSO_ENABLED", "false").lower() == "true"


def _setting(name: str) -> str:
    value = os.getenv(name, "").strip()
    if not value:
        raise HTTPException(503, f"SSO configuration missing: {name}")
    return value


def _public_url() -> str:
    url = _setting("PORTAL_PUBLIC_URL").rstrip("/")
    if not url.startswith("https://") and not (
        os.getenv("SSO_ALLOW_INSECURE_LOCAL", "false").lower() == "true"
        and url.startswith("http://localhost:")
    ):
        raise HTTPException(503, "Portal public URL must use HTTPS")
    return url


def _apps() -> dict:
    # Map of application id to its exact registered callback URL and shared secret.
    # Server-local configuration only; do not put this JSON in the frontend.
    import json
    try:
        raw = json.loads(_setting("SSO_APPS_JSON"))
        if not isinstance(raw, dict):
            raise ValueError()
        for item in raw.values():
            if (not isinstance(item, dict) or
                not isinstance(item.get("callback"), str) or
                not item["callback"].startswith("https://") or
                not isinstance(item.get("secret"), str) or len(item["secret"]) < 32 or
                "?" in item["callback"] or "#" in item["callback"]):
                raise ValueError()
        return raw
    except (ValueError, TypeError):
        raise HTTPException(503, "SSO application configuration invalid")


def _purge(now: float):
    for store in (_pending, _sessions, _codes):
        for key, record in list(store.items()):
            if record[0] <= now:
                store.pop(key, None)


def current_user(request: Request) -> dict | None:
    if not enabled():
        return None
    token = request.cookies.get("portal_session", "")
    record = _sessions.get(token)
    if not record or record[0] <= time.time():
        return None
    return record[1]


def _workflow_query(uid: str) -> dict:
    """Synchronous SQL authentication. Run from a thread to avoid blocking FastAPI."""
    import pytds

    # SQL lives in server-side configuration and must return one row per UID
    # with the aliases uid, name, department, active.
    query = _setting("WORKFLOW_USER_SQL").strip()
    if (not re.match(r"^SELECT\b", query, flags=re.IGNORECASE) or
        query.count("%s") != 1 or ";" in query or "--" in query or "/*" in query):
        raise HTTPException(503, "Workflow query must be one parameterized SELECT")
    try:
        with pytds.connect(
            dsn=_setting("WORKFLOW_DB_HOST"),
            port=int(os.getenv("WORKFLOW_DB_PORT", "1433")),
            database=_setting("WORKFLOW_DB_NAME"),
            user=_setting("WORKFLOW_DB_USER"),
            password=_setting("WORKFLOW_DB_PASSWORD"),
            login_timeout=5,
            timeout=5,
            as_dict=True,
            readonly=True,
            autocommit=True,
            cafile=os.getenv("WORKFLOW_DB_CA_FILE") or None,
            validate_host=True,
        ) as connection:
            with connection.cursor() as cursor:
                cursor.execute(query, (uid,))
                first = cursor.fetchone()
                second = cursor.fetchone()
    except HTTPException:
        raise
    except (Exception,) as exc:
        # Never leak SQL credentials or server error details to browsers.
        raise HTTPException(503, "Workflow SQL Server lookup unavailable") from exc

    if not first or second is not None:
        raise HTTPException(403, "Workflow user missing or not unique")
    if str(first.get("uid", "")) != uid or first.get("active") not in (1, True):
        raise HTTPException(403, "Workflow user mismatch or inactive")
    return {"uid": uid, "name": str(first.get("name") or "")[:120],
            "department": str(first.get("department") or "")[:120]}


async def _workflow_user(uid: str) -> dict:
    return await asyncio.to_thread(_workflow_query, uid)


async def _cas_account(ticket: str) -> str:
    cas = _setting("CAS_BASE_URL").rstrip("/")
    if not cas.startswith(("http://", "https://")):
        raise HTTPException(503, "CAS URL invalid")
    try:
        async with httpx.AsyncClient(timeout=5, follow_redirects=False) as client:
            response = await client.get(f"{cas}/api/domain/valid_ticket", params={"ticket": ticket})
            response.raise_for_status()
            account = response.content.decode("utf-8").strip()
    except (httpx.HTTPError, UnicodeError):
        raise HTTPException(401, "CAS ticket verification failed")
    if not UID_RE.fullmatch(account):
        raise HTTPException(401, "CAS returned an invalid account")
    return account


async def _authorize(app_id: str, user: dict) -> RedirectResponse:
    app = _apps().get(app_id)
    if app is None:
        raise HTTPException(400, "Unknown registered application")
    code = secrets.token_urlsafe(32)
    async with _lock:
        _purge(time.time())
        _codes[code] = (time.time() + CODE_AGE, app_id, user)
    return RedirectResponse(app["callback"] + "?" + urlencode({"code": code}), status_code=303)


@router.get("/sso/login")
async def login(request: Request, app_id: str = ""):
    if not enabled():
        raise HTTPException(503, "SSO is not enabled")
    if app_id and app_id not in _apps():
        raise HTTPException(400, "Unknown registered application")
    existing = current_user(request)
    if existing:
        return await _authorize(app_id, existing) if app_id else RedirectResponse("/", 303)
    nonce = secrets.token_urlsafe(32)
    async with _lock:
        _purge(time.time())
        _pending[nonce] = (time.time() + PENDING_AGE, app_id)
    callback = _public_url() + "/sso/callback"
    cas_url = _setting("CAS_BASE_URL").rstrip("/") + "/api/domain/login"
    response = RedirectResponse(cas_url + "?" + urlencode({"service": callback}), status_code=303)
    response.set_cookie("sso_pending", nonce, max_age=PENDING_AGE, secure=not _local(),
                        httponly=True, samesite="lax", path="/")
    return response


def _local() -> bool:
    return os.getenv("SSO_ALLOW_INSECURE_LOCAL", "false").lower() == "true" and _public_url().startswith("http://localhost:")


@router.get("/sso/callback")
async def callback(request: Request, ticket: str = ""):
    nonce = request.cookies.get("sso_pending", "")
    async with _lock:
        pending = _pending.pop(nonce, None)
    if not ticket or len(ticket) > 2048 or not pending or pending[0] < time.time():
        raise HTTPException(401, "Missing or expired login request")
    uid = await _cas_account(ticket)
    user = await _workflow_user(uid)
    session = secrets.token_urlsafe(32)
    async with _lock:
        _purge(time.time())
        _sessions[session] = (time.time() + SESSION_AGE, user)
    result = await _authorize(pending[1], user) if pending[1] else RedirectResponse("/", 303)
    result.delete_cookie("sso_pending", path="/")
    result.set_cookie("portal_session", session, max_age=SESSION_AGE, secure=not _local(),
                      httponly=True, samesite="lax", path="/")
    result.headers["Cache-Control"] = "no-store"
    return result


@router.get("/api/me")
async def me(request: Request):
    if not enabled():
        return {"enabled": False}
    return {"enabled": True, "user": current_user(request)}


class VerifyRequest(BaseModel):
    app_id: str = Field(min_length=1, max_length=80)
    secret: str = Field(min_length=1)
    code: str = Field(min_length=1, max_length=256)


@router.post("/sso/verify")
async def verify(payload: VerifyRequest):
    if not enabled():
        raise HTTPException(503, "SSO is not enabled")
    registered = _apps().get(payload.app_id)
    if registered is None or not secrets.compare_digest(
        registered["secret"], payload.secret
    ):
        raise HTTPException(401, "Invalid application credentials")
    # Consume the code atomically. A wrong app cannot consume another app's code.
    async with _lock:
        record = _codes.get(payload.code)
        if not record or record[0] < time.time() or record[1] != payload.app_id:
            raise HTTPException(401, "Invalid or expired authorization code")
        _codes.pop(payload.code)
    return JSONResponse({"user": record[2]}, headers={"Cache-Control": "no-store"})


@router.post("/sso/logout")
async def logout(request: Request):
    token = request.cookies.get("portal_session", "")
    async with _lock:
        _sessions.pop(token, None)
    response = JSONResponse({"ok": True}, headers={"Cache-Control": "no-store"})
    response.delete_cookie("portal_session", path="/")
    return response
