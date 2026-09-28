import os
from pydantic import BaseModel

class Config(BaseModel):
    # Upstream OpenWebUI / GPU node details
    UPSTREAM_BASE_URL: str = os.getenv("UPSTREAM_BASE_URL", "https://ai-gpu-node.tailfa114b.ts.net/api/v1")
    DEFAULT_MODEL_ID: str = os.getenv("DEFAULT_MODEL_ID", "nvidia/Qwen3.6-35B-A3B-NVFP4")
    EMBEDDING_MODEL_ID: str = os.getenv("EMBEDDING_MODEL_ID", "BAAI/bge-small-en-v1.5")
    
    # Server settings
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8000"))
    
    # Compliance policy settings: "ANONYMIZE" (placeholder mapping), "REDACT" ([REDACTED]), "HASH" ([HASH:xxx]), "BLOCK" (deny request), "LOG_ONLY"
    PII_ACTION_MODE: str = os.getenv("PII_ACTION_MODE", "ANONYMIZE")
    
    # De-anonymize response output back to client
    DEANONYMIZE_OUTPUT: bool = os.getenv("DEANONYMIZE_OUTPUT", "true").lower() == "true"
    
    # Audit log settings
    ENABLE_AUDIT_LOG: bool = os.getenv("ENABLE_AUDIT_LOG", "true").lower() == "true"

config = Config()
