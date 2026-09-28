import time
import json
import os
import uuid
import httpx
from fastapi import FastAPI, Request, HTTPException, Depends
from fastapi.responses import HTMLResponse, StreamingResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

from pii_proxy.config import config
from pii_proxy.pii_detector import PIIDetector
from pii_proxy.anonymizer import PIIAnonymizer, PIISessionVault
from pii_proxy.audit import audit_logger

app = FastAPI(title="PII Data Anonymization Governance Proxy", version="1.0.0")

@app.middleware("http")
async def log_requests(request: Request, call_next):
    if request.url.path not in ["/api/stats", "/api/audit-receipts", "/health"]:
        print(f"📥 [PROXY INGRESS] {request.method} {request.url.path}")
    response = await call_next(request)
    return response

# Setup templates directory
templates = Jinja2Templates(directory=os.path.join(os.path.dirname(__file__), "templates"))

# Global singleton detector & anonymizer
detector = PIIDetector()
anonymizer = PIIAnonymizer(detector=detector)

class TestInspectRequest(BaseModel):
    prompt: str
    mode: Optional[str] = "ANONYMIZE"
    user_id: Optional[str] = "user_demo"

@app.get("/", response_class=HTMLResponse)
async def render_dashboard(request: Request):
    """Render the dashboard UI."""
    return templates.TemplateResponse("index.html", {"request": request})

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "upstream_base_url": config.UPSTREAM_BASE_URL,
        "default_model_id": config.DEFAULT_MODEL_ID,
        "pii_action_mode": config.PII_ACTION_MODE
    }

@app.get("/api/stats")
async def get_stats():
    return audit_logger.get_stats()

@app.get("/api/audit-receipts")
async def get_audit_receipts(limit: int = 50):
    return audit_logger.get_recent_receipts(limit=limit)

@app.post("/api/test-inspect")
async def test_inspect(req: TestInspectRequest):
    """Test endpoint for inspecting and anonymizing prompt PII."""
    vault = PIISessionVault()
    start_time = time.time()
    anon_text, matches = anonymizer.process_text(req.prompt, vault, mode=req.mode)
    latency_ms = (time.time() - start_time) * 1000.0

    audit_logger.log_event(
        user_id=req.user_id,
        request_id=f"test_{uuid.uuid4().hex[:8]}",
        action_mode=req.mode,
        matches=matches,
        latency_ms=latency_ms
    )

    return {
        "original_prompt": req.prompt,
        "anonymized_prompt": anon_text,
        "matches": [
            {
                "category_id": m.category_id,
                "category_name": m.category_name,
                "entity_type": m.entity_type,
                "confidence": round(m.confidence, 3),
                "text": m.text
            }
            for m in matches
        ],
        "latency_ms": round(latency_ms, 2)
    }

# Forward helper for upstream requests
async def _forward_upstream(endpoint: str, payload: dict, headers: dict) -> httpx.Response:
    url = f"{config.UPSTREAM_BASE_URL.rstrip('/')}/{endpoint.lstrip('/')}"
    async with httpx.AsyncClient(timeout=120.0) as client:
        response = await client.post(url, json=payload, headers=headers)
        return response

@app.get("/v1/models")
@app.get("/models")
@app.get("/api/v1/models")
@app.get("/api/models")
async def list_models(request: Request):
    """Proxy /v1/models or return default model list."""
    auth_header = request.headers.get("Authorization", "")
    headers = {"Authorization": auth_header} if auth_header else {}
    
    try:
        url = f"{config.UPSTREAM_BASE_URL.rstrip('/')}/models"
        async with httpx.AsyncClient(timeout=10.0) as client:
            res = await client.get(url, headers=headers)
            if res.status_code == 200:
                return res.json()
    except Exception:
        pass

    return {
        "object": "list",
        "data": [
            {
                "id": config.DEFAULT_MODEL_ID,
                "object": "model",
                "created": 1700000000,
                "owned_by": "nvidia"
            },
            {
                "id": config.EMBEDDING_MODEL_ID,
                "object": "model",
                "created": 1700000000,
                "owned_by": "BAAI"
            }
        ]
    }

@app.post("/v1/chat/completions")
@app.post("/chat/completions")
@app.post("/api/v1/chat/completions")
@app.post("/api/chat/completions")
async def chat_completions(request: Request):
    """
    OpenAI-compatible /chat/completions endpoint.
    Redacts PII from messages before sending to real OpenWebUI endpoint.
    """
    start_time = time.time()
    req_body = await request.json()
    auth_header = request.headers.get("Authorization", "")

    # Extract user ID or default
    user_id = req_body.get("user") or request.headers.get("X-User-ID") or "cline_user"
    request_id = f"req_{uuid.uuid4().hex[:10]}"

    messages = req_body.get("messages", [])
    vault = PIISessionVault()

    # Apply PII Anonymization on prompt messages
    try:
        processed_messages, matches = anonymizer.process_messages(
            messages=messages,
            vault=vault,
            mode=config.PII_ACTION_MODE
        )
    except ValueError as e:
        # Block mode violation
        raise HTTPException(status_code=400, detail=str(e))

    req_body["messages"] = processed_messages

    # Ensure model ID defaults if missing
    if "model" not in req_body or not req_body["model"]:
        req_body["model"] = config.DEFAULT_MODEL_ID

    is_stream = req_body.get("stream", False)
    headers = {"Content-Type": "application/json"}
    if auth_header:
        headers["Authorization"] = auth_header

    # Log audit event
    latency_ms = (time.time() - start_time) * 1000.0
    audit_logger.log_event(
        user_id=user_id,
        request_id=request_id,
        action_mode=config.PII_ACTION_MODE,
        matches=matches,
        latency_ms=latency_ms
    )

    upstream_url = f"{config.UPSTREAM_BASE_URL.rstrip('/')}/chat/completions"

    if is_stream:
        # Handle SSE Streaming response from upstream
        async def stream_generator():
            client = httpx.AsyncClient(timeout=180.0)
            try:
                async with client.stream("POST", upstream_url, json=req_body, headers=headers) as response:
                    async for chunk in response.aiter_text():
                        # Option to de-anonymize placeholders back in stream output
                        if config.DEANONYMIZE_OUTPUT and chunk:
                            chunk = vault.de_anonymize(chunk)
                        yield chunk
            finally:
                await client.aclose()

        return StreamingResponse(stream_generator(), media_type="text/event-stream")
    else:
        # Handle non-streaming JSON response
        async with httpx.AsyncClient(timeout=120.0) as client:
            res = await client.post(upstream_url, json=req_body, headers=headers)
            if res.status_code != 200:
                return JSONResponse(status_code=res.status_code, content=res.json())

            res_data = res.json()
            # De-anonymize response choices if enabled
            if config.DEANONYMIZE_OUTPUT and "choices" in res_data:
                for choice in res_data.get("choices", []):
                    if "message" in choice and "content" in choice["message"]:
                        c_text = choice["message"]["content"]
                        if isinstance(c_text, str):
                            choice["message"]["content"] = vault.de_anonymize(c_text)

            return JSONResponse(content=res_data)

@app.post("/v1/completions")
@app.post("/completions")
@app.post("/api/v1/completions")
@app.post("/api/completions")
async def text_completions(request: Request):
    """OpenAI-compatible text completions endpoint."""
    start_time = time.time()
    req_body = await request.json()
    auth_header = request.headers.get("Authorization", "")

    user_id = req_body.get("user") or request.headers.get("X-User-ID") or "cline_user"
    request_id = f"req_{uuid.uuid4().hex[:10]}"

    prompt = req_body.get("prompt", "")
    vault = PIISessionVault()
    all_matches = []

    if isinstance(prompt, str) and prompt:
        anon_prompt, matches = anonymizer.process_text(prompt, vault, mode=config.PII_ACTION_MODE)
        req_body["prompt"] = anon_prompt
        all_matches = matches
    elif isinstance(prompt, list):
        anon_prompts = []
        for p in prompt:
            if isinstance(p, str):
                ap, m = anonymizer.process_text(p, vault, mode=config.PII_ACTION_MODE)
                anon_prompts.append(ap)
                all_matches.extend(m)
            else:
                anon_prompts.append(p)
        req_body["prompt"] = anon_prompts

    if "model" not in req_body or not req_body["model"]:
        req_body["model"] = config.DEFAULT_MODEL_ID

    is_stream = req_body.get("stream", False)
    headers = {"Content-Type": "application/json"}
    if auth_header:
        headers["Authorization"] = auth_header

    latency_ms = (time.time() - start_time) * 1000.0
    audit_logger.log_event(
        user_id=user_id,
        request_id=request_id,
        action_mode=config.PII_ACTION_MODE,
        matches=all_matches,
        latency_ms=latency_ms
    )

    upstream_url = f"{config.UPSTREAM_BASE_URL.rstrip('/')}/completions"

    if is_stream:
        async def stream_generator():
            client = httpx.AsyncClient(timeout=180.0)
            try:
                async with client.stream("POST", upstream_url, json=req_body, headers=headers) as response:
                    async for chunk in response.aiter_text():
                        if config.DEANONYMIZE_OUTPUT and chunk:
                            chunk = vault.de_anonymize(chunk)
                        yield chunk
            finally:
                await client.aclose()

        return StreamingResponse(stream_generator(), media_type="text/event-stream")
    else:
        async with httpx.AsyncClient(timeout=120.0) as client:
            res = await client.post(upstream_url, json=req_body, headers=headers)
            if res.status_code != 200:
                return JSONResponse(status_code=res.status_code, content=res.json())

            res_data = res.json()
            if config.DEANONYMIZE_OUTPUT and "choices" in res_data:
                for choice in res_data.get("choices", []):
                    if "text" in choice and isinstance(choice["text"], str):
                        choice["text"] = vault.de_anonymize(choice["text"])

            return JSONResponse(content=res_data)

@app.post("/v1/embeddings")
@app.post("/embeddings")
@app.post("/api/v1/embeddings")
@app.post("/api/embeddings")
async def embeddings(request: Request):
    """Proxy /v1/embeddings endpoint to upstream BAAI/bge-small-en-v1.5."""
    req_body = await request.json()
    auth_header = request.headers.get("Authorization", "")
    headers = {"Content-Type": "application/json"}
    if auth_header:
        headers["Authorization"] = auth_header

    if "model" not in req_body or not req_body["model"]:
        req_body["model"] = config.EMBEDDING_MODEL_ID

    upstream_url = f"{config.UPSTREAM_BASE_URL.rstrip('/')}/embeddings"
    async with httpx.AsyncClient(timeout=60.0) as client:
        res = await client.post(upstream_url, json=req_body, headers=headers)
        return JSONResponse(status_code=res.status_code, content=res.json())
