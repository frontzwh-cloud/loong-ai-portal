import json
import os
from typing import AsyncIterator

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

load_dotenv()

app = FastAPI(title="LOONG AI Portal API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


class ChatRequest(BaseModel):
    messages: list[dict[str, str]]


def event(kind: str, content: str = "") -> str:
    return json.dumps({"type": kind, "content": content}, ensure_ascii=False) + "\n"


async def stream_chat(messages: list[dict[str, str]]) -> AsyncIterator[str]:
    api_key = os.getenv("DEEPSEEK_API_KEY")
    base_url = os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com").rstrip("/")
    model = os.getenv("DEEPSEEK_MODEL", "deepseek-v4-flash")
    if not api_key:
        yield event("error", "尚未配置 DEEPSEEK_API_KEY。请在 backend/.env 中配置后重试。")
        return

    payload = {
        "model": model,
        "messages": messages,
        "stream": True,
        "reasoning_effort": "high",
        "extra_body": {"thinking": {"type": "enabled"}},
    }
    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(90.0, connect=10.0), verify=False) as client:
            async with client.stream("POST", f"{base_url}/v1/chat/completions", json=payload, headers=headers) as response:
                if response.status_code >= 400:
                    detail = (await response.aread()).decode("utf-8", errors="replace")
                    yield event("error", f"DeepSeek 请求失败（HTTP {response.status_code}）。{detail[:180]}")
                    return
                async for line in response.aiter_lines():
                    if not line.startswith("data:"):
                        continue
                    data = line[5:].strip()
                    if data == "[DONE]":
                        break
                    try:
                        chunk = json.loads(data)
                        delta = chunk.get("choices", [{}])[0].get("delta", {})
                        reasoning = delta.get("reasoning_content") or delta.get("reasoning")
                        answer = delta.get("content")
                        if reasoning:
                            yield event("reasoning_delta", reasoning)
                        if answer:
                            yield event("answer_delta", answer)
                    except json.JSONDecodeError:
                        continue
        yield event("completed")
    except httpx.HTTPError:
        yield event("error", "无法连接 DeepSeek 服务，请检查网络、Base URL 和 API key。")
    except Exception:
        yield event("error", "服务暂时不可用，请稍后重试。")


@app.get("/api/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "deepseek": "configured" if os.getenv("DEEPSEEK_API_KEY") else "not_configured"}


@app.post("/api/chat")
async def chat(request: ChatRequest) -> StreamingResponse:
    return StreamingResponse(stream_chat(request.messages), media_type="application/x-ndjson")
