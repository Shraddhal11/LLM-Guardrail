# 🛡️ PII Governance & Anonymization Reverse Proxy Platform

An OpenAI-compatible execution control plane and PII anonymization reverse proxy built for local SLMs/LLMs (such as `nvidia/Qwen3.6-35B-A3B-NVFP4`) integrated with **Neon PostgreSQL Database** & **Clerk Auth**.

---

## 🐳 Running with Docker

### Option 1: Docker Compose (Recommended)
```bash
# Build and run containerized platform on port 8000 & port 80
docker compose up --build -d
```

### Option 2: Docker Build & Run
```bash
# 1. Build image
docker build -t pii-governance-proxy .

# 2. Run container
docker run -d -p 8000:8000 -p 80:8000 \
  -e DATABASE_URL="postgresql://neondb_owner:npg_BIrh05EqdNPs@ep-sweet-grass-b3v25j2p-pooler.c-4.ap-southeast-1.aws.neon.tech/neondb?sslmode=require" \
  -e UPSTREAM_BASE_URL="https://ai-gpu-node.tailfa114b.ts.net/api/v1" \
  -e DEFAULT_MODEL_ID="nvidia/Qwen3.6-35B-A3B-NVFP4" \
  --name pii-proxy pii-governance-proxy
```

---

## 🗄️ Neon PostgreSQL Database & Clerk Integration

* **Neon PostgreSQL Connection**:
  `postgresql://neondb_owner:npg_BIrh05EqdNPs@ep-sweet-grass-b3v25j2p-pooler.c-4.ap-southeast-1.aws.neon.tech/neondb?sslmode=require`

* **Clerk Auth Publishable Key**:
  `VITE_CLERK_PUBLISHABLE_KEY=pk_test_ZHJpdmVuLWNsYW0tOTMwNi5jbGVyay5hY2NvdW50cy5kZXYk`

* **PostgreSQL Schemas**:
  - `users`: Stores `clerk_user_id`, `email`, `name`, `user_uuid`, `api_key`, `trust_score`
  - `query_logs`: Stores request payloads, original vs anonymized prompts, `pii_count`, `latency_ms`, SHA-256 hash chains
  - `pii_detected_items`: Stores individual PII entities detected (`category_name`, `entity_type`, `placeholder_token`, `confidence`)

---

## 🔗 User Identification & Proxy URL Links

Each user gets a personalized proxy URL identified by their unique `user_uuid`:

- **Proxy URL**: `http://localhost:8000/proxy/{user_uuid}/v1`
- **Short URL (Port 80)**: `http://localhost:80/{user_uuid}/v1`

When configured in **Cline Settings**:
- **API Provider**: `OpenAI Compatible`
- **Base URL**: `http://localhost:8000/proxy/{user_uuid}/v1`
- **Model ID**: `nvidia/Qwen3.6-35B-A3B-NVFP4`

---

## 🛡️ Supported Compliance Categories (15 Safe Harbor & DPDP Categories)

1. **Names**: Full names, Dr./Mr./Mrs./Patient prefixes, initials, employer names
2. **Geographical Data**: Street addresses, City/County names, ZIP / Postal codes (`62701`, `90210`)
3. **Dates Directly Related to Individuals**: DOB, Admission, Discharge, Death dates (Years excluded)
4. **Telephone Numbers**: US & international phone formats, extensions (`8275917929`, `+91 702870-5476`)
5. **Fax Numbers**: Dedicated fax number detection
6. **Email Addresses**: Standard email formats (`name@company.com`)
7. **Social Security Numbers (SSN)**: `XXX-XX-XXXX` and SSN keyword contexts
8. **Medical Record Numbers (MRN)**: `MRN-XXXXXX`, hospital chart IDs
9. **Health Plan Beneficiary Numbers**: Policy IDs, Medicare / HICN IDs, Member IDs
10. **Account Numbers**: Credit cards (`4532-XXXX-XXXX-XXXX`), Bank IBAN & Financial account numbers
11. **Certificate / License Numbers**: Driver's License numbers, professional certificate IDs
12. **Vehicle Identifiers**: VIN (17-character VINs) and License Plate Tag numbers
13. **Device Identifiers**: MAC addresses (`00:1B:44:11:3A:B7`), UUIDs, IMEI numbers, Serial Numbers
14. **Web URLs**: HTTP/HTTPS URIs and web domains
15. **IP Address Numbers**: IPv4 (`192.168.1.1`) and IPv6 addresses
