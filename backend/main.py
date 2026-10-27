import asyncio
import json
import os
from pathlib import Path
from typing import AsyncIterator, Literal
from urllib.parse import urlsplit

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, ConfigDict, Field, model_validator

ROOT = Path(__file__).resolve().parent.parent
load_dotenv(ROOT / "backend" / ".env")
app = FastAPI(title="LOONG AI Portal API")
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
                   allow_credentials=False, allow_methods=["GET", "POST"], allow_headers=["Content-Type"])

# Bound the body before JSON parsing, including chunked requests.
class BodyLimit:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http" or scope["method"] != "POST":
            return await self.app(scope, receive, send)
        chunks, size = [], 0
        while True:
            message = await receive()
            if message["type"] == "http.disconnect":
                return
            size += len(message.get("body", b""))
            if size > 262144:
                return await JSONResponse({"detail": "Request too large (256 KiB limit)"}, 413)(scope, receive, send)
            chunks.append(message)
            if not message.get("more_body", False):
                break
        async def replay():
            return chunks.pop(0) if chunks else await receive()
        await self.app(scope, replay, send)

app.add_middleware(BodyLimit)

class Message(BaseModel):
    model_config = ConfigDict(extra="forbid")
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=16000)

class ChatRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    messages: list[Message] = Field(min_length=1, max_length=40)

    @model_validator(mode="after")
    def bounded_context(self):
        if sum(len(m.content) for m in self.messages) > 64000:
            raise ValueError("Conversation exceeds 64000 characters; start a new chat")
        if self.messages[-1].role != "user":
            raise ValueError("Last message must be from user")
        return self


def event(kind: str, content: str = "") -> str:
    return json.dumps({"type": kind, "content": content}, ensure_ascii=False) + "\n"


def mode() -> str:
    return "demo" if os.getenv("PORTAL_DEMO_MODE", "false").lower() == "true" else "live"


def safe_url(value: str) -> str:
    try:
        parsed = urlsplit(value)
        return value if parsed.scheme in ("https", "http") and parsed.hostname and not parsed.username and not parsed.password else ""
    except ValueError:
        return ""


async def stream_chat(messages: list[dict[str, str]]) -> AsyncIterator[str]:
    if mode() == "demo":
        answer = "【本地演示 · 非真实 AI】已收到你的消息。此模式不连接模型，也不会生成真实业务结果。配置 backend/.env 后重启，即可使用已获批准的 AI 服务。"
        for start in range(0, len(answer), 8):
            yield event("answer_delta", answer[start:start + 8])
            await asyncio.sleep(0.035)
        yield event("completed")
        return
    api_key = os.getenv("DEEPSEEK_API_KEY", "").strip()
    base_url = os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com").rstrip("/")
    model = os.getenv("DEEPSEEK_MODEL", "").strip()
    internal_no_key = bool(safe_url(base_url)) and urlsplit(base_url).hostname == "vio.automotive-wan.com"
    if not model or (not api_key and not internal_no_key):
        yield event("error", "AI 待配置：请在 backend/.env 设置 DEEPSEEK_API_KEY 和 DEEPSEEK_MODEL，然后重启。可设置 PORTAL_DEMO_MODE=true 体验本地演示。")
        return
    if not safe_url(base_url) or urlsplit(base_url).scheme != "https" or urlsplit(base_url).query or urlsplit(base_url).fragment:
        yield event("error", "模型地址无效：请使用不含账号、查询参数或片段的 HTTPS Base URL。")
        return
    endpoint = f"{base_url}/chat/completions" if base_url.endswith("/v1") else f"{base_url}/v1/chat/completions"
    payload = {"model": model, "messages": messages, "stream": True}
    headers = {"Content-Type": "application/json"}
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"
    verify_ssl = not (internal_no_key and os.getenv("DEEPSEEK_VERIFY_SSL", "true").lower() == "false")
    try:
        # Explicit opt-out is scoped to the configured internal service only.
        async with httpx.AsyncClient(timeout=httpx.Timeout(120.0, connect=10.0), verify=verify_ssl) as client:
            async with client.stream("POST", endpoint, json=payload, headers=headers) as response:
                if response.status_code >= 400:
                    yield event("error", f"模型请求失败（HTTP {response.status_code}）。请检查模型、密钥、额度和服务地址后重试。")
                    return
                completed = False
                async for line in response.aiter_lines():
                    if not line.startswith("data:"):
                        continue
                    data = line[5:].strip()
                    if data == "[DONE]":
                        completed = True
                        break
                    try:
                        chunk = json.loads(data)
                        if "error" in chunk:
                            yield event("error", "模型服务返回错误，请稍后重试。")
                            return
                        choices = chunk.get("choices") or []
                        if not choices:
                            continue
                        delta = choices[0].get("delta") or {}
                        if choices[0].get("finish_reason"):
                            completed = True
                        for field, kind in [("reasoning_content", "reasoning_delta"), ("content", "answer_delta")]:
                            content = delta.get(field) or (delta.get("reasoning") if field == "reasoning_content" else None)
                            if isinstance(content, str) and content:
                                yield event(kind, content)
                    except (json.JSONDecodeError, AttributeError, TypeError, IndexError):
                        yield event("error", "模型返回了无法识别的数据，请检查兼容接口。")
                        return
        yield event("completed") if completed else event("error", "连接提前结束，回答可能不完整，请重试。")
    except httpx.HTTPError:
        yield event("error", "无法连接模型服务，请检查网络、HTTPS 证书和服务地址。")
    except Exception:
        yield event("error", "服务暂时不可用，请稍后重试。")


@app.get("/api/health")
async def health():
    base_url = os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com")
    internal = bool(safe_url(base_url)) and urlsplit(base_url).hostname == "vio.automotive-wan.com"
    configured = bool(os.getenv("DEEPSEEK_MODEL", "").strip() and (internal or os.getenv("DEEPSEEK_API_KEY", "").strip()))
    return {"status": "ok", "app": "loong-ai-portal", "mode": mode(),
            "deepseek": "configured" if configured else "not_configured"}


@app.get("/api/config")
async def config():
    # Explicit allowlist only. Never serialize the environment or API credentials.
    keys = {"gemba": "GEMBA_URL", "meeting": "MEETING_DOWNLOAD_URL", "knowledge": "KNOWLEDGE_URL",
            "workflow": "WORKFLOW_URL", "pdf": "PDF_TOOL_URL", "tools": "OFFICE_TOOLS_URL"}
    return {"links": {key: safe_url(os.getenv(value, "")) for key, value in keys.items()}}


@app.post("/api/chat")
async def chat(request: ChatRequest):
    return StreamingResponse(stream_chat([m.model_dump() for m in request.messages]), media_type="application/x-ndjson",
                             headers={"Cache-Control": "no-store", "X-Accel-Buffering": "no"})


# Mount only the built public assets, never the project root or backend configuration.
if (ROOT / "frontend" / "dist").is_dir():
    app.mount("/", StaticFiles(directory=ROOT / "frontend" / "dist", html=True), name="frontend")
