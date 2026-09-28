#!/bin/bash
echo "=========================================================================="
echo " Starting PII Data Governance & Anonymization Proxy Server"
echo " Upstream Target: https://ai-gpu-node.tailfa114b.ts.net/api/v1"
echo " Model ID: nvidia/Qwen3.6-35B-A3B-NVFP4"
echo "=========================================================================="

cd "$(dirname "$0")"
source venv/bin/activate

export UPSTREAM_BASE_URL="https://ai-gpu-node.tailfa114b.ts.net/api/v1"
export DEFAULT_MODEL_ID="nvidia/Qwen3.6-35B-A3B-NVFP4"
export EMBEDDING_MODEL_ID="BAAI/bge-small-en-v1.5"
export PORT="8000"

python3 -m uvicorn pii_proxy.main:app --host 0.0.0.0 --port 8000 --reload --reload-exclude "data/*"
