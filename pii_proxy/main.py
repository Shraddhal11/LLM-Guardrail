import time
import json
import os
import uuid
import httpx
from fastapi import FastAPI, Request, HTTPException, Depends
from fastapi.responses import HTMLResponse, StreamingResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

from pii_proxy.config import config
from pii_proxy.pii_detector import PIIDetector
from pii_proxy.anonymizer import PIIAnonymizer, PIISessionVault
from pii_proxy.audit import audit_logger
from pii_proxy.db import init_db, SessionLocal, DBUser, DBQueryLog, DBPIIDetectedItem

app = FastAPI(title="PII Data Anonymization Governance Proxy Platform", version="2.0.0")

# Enable CORS for React Frontend (Vite) & all origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup_event():
    """Ensure database tables exist in Neon PostgreSQL on startup."""
    try:
        init_db()
    except Exception as e:
        print(f"Warning initializing DB: {e}")

@app.middleware("http")
async def log_requests(request: Request, call_next):
    if request.url.path not in ["/api/stats", "/api/audit-receipts", "/health"] and not request.url.path.startswith("/api/users"):
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

class UserSyncRequest(BaseModel):
    clerk_user_id: str
    email: Optional[str] = None
    name: Optional[str] = None

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    print(f"❌ Unhandled exception on {request.url.path}: {exc}")
    import traceback
    traceback.print_exc()
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal Server Error", "error": str(exc)}
    )

TEMPLATES_DIR = os.path.join(os.path.dirname(__file__), "templates")
INDEX_HTML_PATH = os.path.join(TEMPLATES_DIR, "index.html")

@app.get("/", response_class=HTMLResponse)
async def render_dashboard(request: Request):
    """Render the dashboard UI with environment settings."""
    clerk_key = os.getenv("VITE_CLERK_PUBLISHABLE_KEY", "")
    clerk_url = os.getenv("CLERK_FRONTEND_API_URL", "https://driven-clam-9306.clerk.accounts.dev/npm/@clerk/clerk-js@5/dist/clerk.browser.js")
    try:
        return templates.TemplateResponse("index.html", {
            "request": request,
            "clerk_publishable_key": clerk_key,
            "clerk_js_url": clerk_url
        })
    except Exception as e:
        print(f"Template load error: {e}")
        if os.path.exists(INDEX_HTML_PATH):
            with open(INDEX_HTML_PATH, "r", encoding="utf-8") as f:
                content = f.read()
            content = content.replace("{{ clerk_publishable_key }}", clerk_key)
            content = content.replace("{{ clerk_js_url }}", clerk_url)
            return HTMLResponse(content=content)
        raise HTTPException(status_code=500, detail=f"Dashboard template error: {e}")

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "upstream_base_url": config.UPSTREAM_BASE_URL,
        "default_model_id": config.DEFAULT_MODEL_ID,
        "pii_action_mode": config.PII_ACTION_MODE
    }

@app.get("/api/stats")
async def get_stats(user_uuid: Optional[str] = None):
    return audit_logger.get_stats(user_uuid=user_uuid)

@app.get("/api/audit-receipts")
async def get_audit_receipts(limit: int = 50, user_uuid: Optional[str] = None):
    return audit_logger.get_recent_receipts(limit=limit, user_uuid=user_uuid)

@app.post("/api/users/sync")
async def sync_user(req: UserSyncRequest, request: Request):
    """
    Sync Clerk authenticated user with Neon PostgreSQL database.
    Generates a unique user_uuid and custom proxy link based on host domain.
    """
    db = SessionLocal()
    try:
        user = db.query(DBUser).filter(DBUser.clerk_user_id == req.clerk_user_id).first()
        if not user:
            # Generate short 8-char random hex user_uuid
            u_uuid = f"usr_{uuid.uuid4().hex[:8]}"
            api_key = f"key_{uuid.uuid4().hex[:16]}"
            user = DBUser(
                clerk_user_id=req.clerk_user_id,
                email=req.email,
                name=req.name,
                user_uuid=u_uuid,
                api_key=api_key,
                trust_score=100.0
            )
            db.add(user)
            db.commit()
            db.refresh(user)

        base_url = str(request.base_url).rstrip("/")
        proxy_url = f"{base_url}/proxy/{user.user_uuid}/v1"
        direct_url = f"{base_url}/{user.user_uuid}/v1"

        return {
            "id": user.id,
            "clerk_user_id": user.clerk_user_id,
            "email": user.email,
            "name": user.name,
            "user_uuid": user.user_uuid,
            "api_key": user.api_key,
            "trust_score": user.trust_score,
            "proxy_url": proxy_url,
            "direct_url": direct_url
        }
    finally:
        db.close()

@app.get("/api/users/{user_uuid}/queries")
async def get_user_queries(user_uuid: str, limit: int = 50):
    """Get queries and detected PII items from Neon DB for specific user_uuid."""
    db = SessionLocal()
    try:
        logs = db.query(DBQueryLog).filter(DBQueryLog.user_uuid == user_uuid).order_by(DBQueryLog.created_at.desc()).limit(limit).all()
        results = []
        for log in logs:
            items = db.query(DBPIIDetectedItem).filter(DBPIIDetectedItem.query_log_id == log.id).all()
            cats = json.loads(log.categories_found) if log.categories_found else []
            results.append({
                "id": log.id,
                "request_id": log.request_id,
                "endpoint": log.endpoint,
                "model": log.model,
                "original_prompt": log.original_prompt,
                "anonymized_prompt": log.anonymized_prompt,
                "pii_count": log.pii_count,
                "categories_found": cats,
                "action_mode": log.action_mode,
                "latency_ms": log.latency_ms,
                "created_at": log.created_at.isoformat() if log.created_at else None,
                "previous_hash": log.previous_hash,
                "current_hash": log.current_hash,
                "pii_items": [
                    {
                        "category_id": item.category_id,
                        "category_name": item.category_name,
                        "entity_type": item.entity_type,
                        "original_text": item.original_text,
                        "placeholder_token": item.placeholder_token,
                        "confidence": item.confidence
                    }
                    for item in items
                ]
            })
        return results
    finally:
        db.close()

@app.post("/api/test-inspect")
async def test_inspect(req: TestInspectRequest):
    """Test endpoint for inspecting and anonymizing prompt PII."""
    vault = PIISessionVault()
    start_time = time.time()
    mode = req.mode or "ANONYMIZE"

    try:
        anon_text, matches = anonymizer.process_text(req.prompt, vault, mode=mode)
    except ValueError as e:
        latency_ms = (time.time() - start_time) * 1000.0
        # Detect matches for logging blocked attempt
        matches = detector.detect(req.prompt)
        audit_logger.log_event(
            user_id=req.user_id,
            user_uuid="default_user",
            request_id=f"block_{uuid.uuid4().hex[:8]}",
            action_mode="BLOCK",
            matches=matches,
            latency_ms=latency_ms,
            endpoint="/api/test-inspect",
            original_prompt=req.prompt,
            anonymized_prompt="[BLOCKED_POLICY_VIOLATION]",
            vault=vault
        )
        return JSONResponse(
            status_code=400,
            content={
                "error": str(e),
                "blocked": True,
                "action_mode": "BLOCK",
                "original_prompt": req.prompt,
                "anonymized_prompt": "🚫 REQUEST BLOCKED BY COMPLIANCE POLICY",
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
        )

    latency_ms = (time.time() - start_time) * 1000.0
    audit_logger.log_event(
        user_id=req.user_id,
        user_uuid="default_user",
        request_id=f"test_{uuid.uuid4().hex[:8]}",
        action_mode=mode,
        matches=matches,
        latency_ms=latency_ms,
        endpoint="/api/test-inspect",
        original_prompt=req.prompt,
        anonymized_prompt=anon_text,
        vault=vault
    )

    return {
        "original_prompt": req.prompt,
        "anonymized_prompt": anon_text,
        "action_mode": mode,
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

@app.get("/v1/models")
@app.get("/models")
@app.get("/api/v1/models")
@app.get("/api/models")
@app.get("/proxy/{user_uuid}/v1/models")
@app.get("/proxy/{user_uuid}/models")
@app.get("/{user_uuid}/v1/models")
@app.get("/{user_uuid}/models")
async def list_models(request: Request, user_uuid: Optional[str] = None):
    """Proxy models endpoint."""
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

class ConfigUpdateModeRequest(BaseModel):
    mode: str

@app.get("/api/config/action-mode")
async def get_action_mode():
    return {"pii_action_mode": config.PII_ACTION_MODE}

@app.post("/api/config/action-mode")
async def update_action_mode(req: ConfigUpdateModeRequest):
    valid_modes = ["ANONYMIZE", "REDACT", "HASH", "BLOCK", "LOG_ONLY"]
    mode = req.mode.upper()
    if mode not in valid_modes:
        raise HTTPException(status_code=400, detail=f"Invalid action mode. Must be one of {valid_modes}")
    config.PII_ACTION_MODE = mode
    print(f"⚙️ [CONFIG UPDATE] PII_ACTION_MODE set to: {config.PII_ACTION_MODE}")
    return {"status": "success", "pii_action_mode": config.PII_ACTION_MODE}

@app.post("/v1/chat/completions")
@app.post("/chat/completions")
@app.post("/api/v1/chat/completions")
@app.post("/api/chat/completions")
@app.post("/proxy/{user_uuid}/v1/chat/completions")
@app.post("/proxy/{user_uuid}/chat/completions")
@app.post("/{user_uuid}/v1/chat/completions")
@app.post("/{user_uuid}/chat/completions")
async def chat_completions(request: Request, user_uuid: Optional[str] = "default_user"):
    """
    OpenAI-compatible /chat/completions endpoint supporting per-user proxy routing.
    Redacts PII from messages before sending to real OpenWebUI endpoint.
    """
    start_time = time.time()
    req_body = await request.json()
    auth_header = request.headers.get("Authorization", "")
    action_mode = request.headers.get("X-Action-Mode") or config.PII_ACTION_MODE

    user_id = req_body.get("user") or request.headers.get("X-User-ID") or user_uuid
    request_id = f"req_{uuid.uuid4().hex[:10]}"

    messages = req_body.get("messages", [])
    vault = PIISessionVault()

    # Apply PII Anonymization / Compliance Policy on prompt messages
    try:
        processed_messages, matches = anonymizer.process_messages(
            messages=messages,
            vault=vault,
            mode=action_mode
        )
    except ValueError as e:
        latency_ms = (time.time() - start_time) * 1000.0
        latest_user_msg = ""
        for idx in range(len(messages) - 1, -1, -1):
            if isinstance(messages[idx], dict) and messages[idx].get("role") == "user":
                latest_user_msg = str(messages[idx].get("content", ""))
                break
        blocked_matches = detector.detect(latest_user_msg) if latest_user_msg else []
        audit_logger.log_event(
            user_id=user_id,
            user_uuid=user_uuid,
            request_id=f"block_{uuid.uuid4().hex[:10]}",
            action_mode="BLOCK",
            matches=blocked_matches,
            latency_ms=latency_ms,
            endpoint="/v1/chat/completions",
            model=req_body.get("model", config.DEFAULT_MODEL_ID),
            original_prompt=latest_user_msg.strip(),
            anonymized_prompt="[BLOCKED_POLICY_VIOLATION]",
            vault=vault
        )
        return JSONResponse(
            status_code=400,
            content={
                "error": {
                    "message": str(e),
                    "type": "compliance_policy_violation",
                    "code": "pii_blocked",
                    "matches_count": len(blocked_matches)
                }
            }
        )

    req_body["messages"] = processed_messages

    if "model" not in req_body or not req_body["model"]:
        req_body["model"] = config.DEFAULT_MODEL_ID

    is_stream = req_body.get("stream", False)
    headers = {"Content-Type": "application/json"}
    if auth_header:
        headers["Authorization"] = auth_header

    # Extract latest user message for audit log prompt & match accounting
    latest_user_msg = ""
    latest_anon_msg = ""
    latest_matches = []

    # Find latest user message index
    latest_idx = -1
    for idx in range(len(messages) - 1, -1, -1):
        msg = messages[idx]
        if isinstance(msg, dict) and msg.get("role") == "user":
            latest_idx = idx
            content = msg.get("content")
            if isinstance(content, str):
                latest_user_msg = content
            elif isinstance(content, list):
                latest_user_msg = " ".join([c.get("text", "") for c in content if isinstance(c, dict) and c.get("type") == "text"])
            break

    if latest_idx >= 0 and latest_idx < len(processed_messages):
        p_msg = processed_messages[latest_idx]
        content = p_msg.get("content")
        if isinstance(content, str):
            latest_anon_msg = content
        elif isinstance(content, list):
            latest_anon_msg = " ".join([c.get("text", "") for c in content if isinstance(c, dict) and c.get("type") == "text"])

    # If latest user message was found, detect matches specifically for latest message for accurate audit receipt
    if latest_user_msg:
        temp_vault = PIISessionVault()
        _, latest_matches = anonymizer.process_text(latest_user_msg, temp_vault, mode=config.PII_ACTION_MODE)
    else:
        latest_user_msg = "No user prompt string"
        latest_anon_msg = "No user prompt string"
        latest_matches = matches

    latency_ms = (time.time() - start_time) * 1000.0
    audit_logger.log_event(
        user_id=user_id,
        user_uuid=user_uuid,
        request_id=request_id,
        action_mode=config.PII_ACTION_MODE,
        matches=latest_matches,
        latency_ms=latency_ms,
        endpoint="/v1/chat/completions",
        model=req_body.get("model", config.DEFAULT_MODEL_ID),
        original_prompt=latest_user_msg.strip(),
        anonymized_prompt=latest_anon_msg.strip(),
        vault=vault
    )

    upstream_url = f"{config.UPSTREAM_BASE_URL.rstrip('/')}/chat/completions"

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
                    if "message" in choice and "content" in choice["message"]:
                        c_text = choice["message"]["content"]
                        if isinstance(c_text, str):
                            choice["message"]["content"] = vault.de_anonymize(c_text)

            return JSONResponse(content=res_data)

@app.post("/v1/completions")
@app.post("/completions")
@app.post("/api/v1/completions")
@app.post("/api/completions")
@app.post("/proxy/{user_uuid}/v1/completions")
@app.post("/proxy/{user_uuid}/completions")
@app.post("/{user_uuid}/v1/completions")
@app.post("/{user_uuid}/completions")
async def text_completions(request: Request, user_uuid: Optional[str] = "default_user"):
    """OpenAI-compatible text completions endpoint."""
    start_time = time.time()
    req_body = await request.json()
    auth_header = request.headers.get("Authorization", "")

    user_id = req_body.get("user") or request.headers.get("X-User-ID") or user_uuid
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
        user_uuid=user_uuid,
        request_id=request_id,
        action_mode=config.PII_ACTION_MODE,
        matches=all_matches,
        latency_ms=latency_ms,
        endpoint="/v1/completions",
        model=req_body.get("model", config.DEFAULT_MODEL_ID),
        original_prompt=str(prompt),
        anonymized_prompt=str(req_body.get("prompt")),
        vault=vault
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
@app.post("/proxy/{user_uuid}/v1/embeddings")
@app.post("/proxy/{user_uuid}/embeddings")
@app.post("/{user_uuid}/v1/embeddings")
@app.post("/{user_uuid}/embeddings")
async def embeddings(request: Request, user_uuid: Optional[str] = "default_user"):
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
