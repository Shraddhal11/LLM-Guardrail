#!/bin/bash
echo "=========================================================================="
echo " Starting PII Data Governance & Anonymization Proxy Server"
echo " Upstream Target: https://ai-gpu-node.tailfa114b.ts.net/api/v1"
echo " Model ID: nvidia/Qwen3.6-35B-A3B-NVFP4"
echo "=========================================================================="

cd "$(dirname "$0")"
source venv/bin/activate

# Load environment variables from .env file
if [ -f .env ]; then
    set -o allexport
    source .env
    set +o allexport
fi

python3 -m uvicorn pii_proxy.main:app --host 0.0.0.0 --port 8000 --reload --reload-exclude "data/*"
