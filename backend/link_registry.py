"""Public navigation destinations: fixed IDs, validated URLs, admin-only durable overrides."""
import hmac
import json
import os
import tempfile
from pathlib import Path
from threading import Lock
from urllib.parse import urlsplit

from fastapi import HTTPException, Request

LINK_ENV = {
    "gemba": "GEMBA_URL",
    "meeting": "MEETING_DOWNLOAD_URL",
    "knowledge": "KNOWLEDGE_URL",
    "workflow": "WORKFLOW_URL",
    "pdf": "PDF_TOOL_URL",
    "tools": "OFFICE_TOOLS_URL",
}
_write_lock = Lock()


def safe_link(value: object) -> str:
    if not isinstance(value, str) or len(value) > 2048 or any(ord(ch) <= 32 or ord(ch) == 127 for ch in value):
        return ""
    try:
        url = urlsplit(value)
        if url.scheme not in ("http", "https") or not url.hostname or url.username or url.password:
            return ""
        _ = url.port
        return value
    except ValueError:
        return ""


def storage_path() -> Path | None:
    location = os.getenv("PORTAL_LINKS_FILE", "").strip()
    return Path(location) if location and Path(location).is_absolute() else None


def overrides() -> dict[str, str]:
    path = storage_path()
    if path is None or not path.exists():
        return {}
    try:
        raw = path.read_text(encoding="utf-8")
        if len(raw) > 20000:
            raise ValueError("oversized app-links file")
        data = json.loads(raw)
        if not isinstance(data, dict) or set(data) - set(LINK_ENV):
            raise ValueError("invalid app-links file")
        if any(not isinstance(v, str) or (v and not safe_link(v)) for v in data.values()):
            raise ValueError("invalid app-links URLs")
        return data
    except (OSError, ValueError, UnicodeError) as exc:
        # Don't silently mask the administrator's last saved registry.
        raise RuntimeError("App link configuration cannot be read") from exc


def public_links() -> dict[str, str]:
    result = {key: safe_link(os.getenv(env, "")) for key, env in LINK_ENV.items()}
    result.update(overrides())
    return result


def require_local_admin(request: Request) -> None:
    """Admin writes are allowed only via localhost browser + secret (typically SSH forwarding).

    Host/Origin are not authentication and may be spoofed by non-browser clients;
    the high-entropy bearer secret is mandatory independently.
    """
    token = os.getenv("PORTAL_ADMIN_TOKEN", "")
    if len(token) < 32:
        raise HTTPException(503, "管理员配置未启用，请在服务器配置 PORTAL_ADMIN_TOKEN。")
    host = request.headers.get("host", "")
    origin = request.headers.get("origin", "")
    try:
        host_name = urlsplit("http://" + host).hostname
        origin_url = urlsplit(origin)
        origin_name = origin_url.hostname
    except ValueError:
        raise HTTPException(403, "仅允许通过本机安全通道使用管理接口。")
    if host_name not in ("127.0.0.1", "localhost"):
        raise HTTPException(403, "请通过 SSH 转发的 localhost 地址访问管理界面。")
    # Same-origin GET requests do not always carry an Origin header; PUT requests do.
    # A bearer secret is still mandatory, so Host/Origin checking is defense in depth.
    if request.method != "GET" or origin:
        if origin_url.scheme != "http" or origin_name not in ("127.0.0.1", "localhost") or origin_url.port not in (8000, 5173):
            raise HTTPException(403, "管理界面来源不受支持。")
    bearer = request.headers.get("authorization", "")
    supplied = bearer[7:] if bearer.startswith("Bearer ") else ""
    if not supplied or not hmac.compare_digest(token, supplied):
        raise HTTPException(401, "管理员密钥无效。")


def save_links(new_links: dict[str, str]) -> dict[str, str]:
    if set(new_links) != set(LINK_ENV):
        raise HTTPException(422, "必须提供全部已支持的应用 ID，不允许添加任意服务。")
    for key, value in new_links.items():
        if not isinstance(value, str) or (value and not safe_link(value)):
            raise HTTPException(422, f"{key} 需要合法的 HTTP(S) 地址，不能包含凭据、空格或控制字符。")
    path = storage_path()
    if path is None:
        raise HTTPException(503, "管理存储未配置 PORTAL_LINKS_FILE。")
    with _write_lock:
        temp_name = None
        try:
            path.parent.mkdir(parents=True, exist_ok=True)
            with tempfile.NamedTemporaryFile("w", encoding="utf-8", dir=path.parent, prefix=".app-links.", delete=False) as handle:
                temp_name = handle.name
                os.chmod(temp_name, 0o600)
                json.dump(new_links, handle, ensure_ascii=False, indent=2)
                handle.flush()
                os.fsync(handle.fileno())
            os.replace(temp_name, path)
            return public_links()
        except OSError as exc:
            raise HTTPException(503, "无法保存应用配置，请检查服务器挂载目录和权限。") from exc
        finally:
            if temp_name and os.path.exists(temp_name):
                os.unlink(temp_name)
