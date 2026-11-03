"""Private admin app; Docker MUST publish this on host 127.0.0.1 only."""
from pathlib import Path
from urllib.parse import urlsplit

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, ConfigDict, Field
from .link_registry import LINK_ENV, public_links, save_links

ROOT = Path(__file__).resolve().parent.parent
app = FastAPI(title="LOONG AI private app-link admin")


@app.middleware("http")
async def check_local_origin(request: Request, call_next):
    # Host and Origin defend against browser DNS rebinding and CSRF.
    # Docker loopback-only publish, NOT these headers, enforces network access.
    host = request.headers.get("host", "")
    try:
        parsed = urlsplit("http://" + host)
        valid = parsed.hostname in ("localhost", "127.0.0.1")
        _ = parsed.port
    except ValueError:
        valid = False
    if not valid:
        return JSONResponse({"detail": "本机管理地址限定为 localhost"}, status_code=403)
    origin = request.headers.get("origin")
    if request.method in ("POST", "PUT", "PATCH", "DELETE"):
        if origin != "http://" + host:
            return JSONResponse({"detail": "拒绝跨来源管理请求"}, status_code=403)
    elif origin is not None and origin != "http://" + host:
        return JSONResponse({"detail": "拒绝跨来源请求"}, status_code=403)
    response = await call_next(request)
    if request.url.path.startswith("/api/"):
        response.headers["Cache-Control"] = "no-store"
    return response


class LinksUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    links: dict[str, str] = Field(max_length=len(LINK_ENV))


@app.get("/api/health")
async def health():
    return {"status": "ok", "app": "loong-ai-portal-admin"}


@app.get("/api/config")
async def get_config():
    try:
        return {"links": public_links()}
    except RuntimeError:
        raise HTTPException(503, "应用链接配置暂不可用")


@app.get("/api/admin/links")
async def get_admin_links():
    try:
        return {"links": public_links()}
    except RuntimeError:
        raise HTTPException(503, "应用链接配置暂不可用")


@app.put("/api/admin/links")
async def put_admin_links(payload: LinksUpdate):
    return {"links": save_links(payload.links)}


DIST = ROOT / "frontend" / "dist"
if DIST.is_dir():
    @app.get("/admin")
    async def admin_page():
        return FileResponse(DIST / "index.html", headers={"Cache-Control": "no-store"})

    app.mount("/", StaticFiles(directory=DIST, html=True), name="admin-ui")
