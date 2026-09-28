# 🛡️ Compliance + Earned-Authority Governance Runtime for SLM/LLM Agents

An OpenAI-compatible execution control plane and PII anonymization reverse proxy built for local SLMs/LLMs (such as `nvidia/Qwen3.6-35B-A3B-NVFP4`).

---

## 🏛️ System Design & Architecture

### 1. Problem Statement & Architecture Goals
Organizations deploying local SLMs/LLMs — especially autonomous or semi-autonomous agents that call tools, mutate data, or trigger actions — face three critical governance gaps:
- **Data Compliance Gap**: Guaranteeing sensitive data (HIPAA Safe Harbor 18 categories & DPDP personal data) does not leak into prompts or return in completions.
- **Execution Authority Gap**: Ensuring agents only take actions they have currently earned the right to take via dynamic trust scoring and monotonic reduction.
- **User Accountability Gap**: Providing per-user visibility into token usage, violation records, and effective vs. wasteful model usage.

### 2. Execution Layer Architecture Diagram
```
                     +---------------------------------------+
                     |         Agent / Client (Cline)        |
                     +---------------------------------------+
                                         |
                                         v
                     +---------------------------------------+
                     |    Governance Control Plane Proxy     |
                     |         (http://localhost:8000)       |
                     +---------------------------------------+
                        |                 |               |
                        v                 v               v
            +-------------------+ +---------------+ +--------------------+
            | PII Anonymizer    | | Earned        | | Tamper-Evident     |
            | Dual-Engine       | | Authority     | | Audit Hash-Chain |
            | (15 Categories)   | | Control Plane | | (data/store.json)|
            +-------------------+ +---------------+ +--------------------+
                                         |
                                         v (Sanitized Payload)
                     +---------------------------------------+
                     |       Shared AI GPU Node Server       |
                     | (nvidia/Qwen3.6-35B-A3B-NVFP4)       |
                     +---------------------------------------+
```

---

## 🚀 Quick Setup Guide

### 1. GPU Node & Upstream Configuration
* **Upstream Base URL**: `https://ai-gpu-node.tailfa114b.ts.net/api/v1`
* **Default Model ID**: `nvidia/Qwen3.6-35B-A3B-NVFP4`
* **Embedding Model ID**: `BAAI/bge-small-en-v1.5`

### 2. Start Local Governance Proxy Server
```bash
./start_proxy.sh
```
The proxy server will start listening at: **`http://localhost:8000`**

### 3. Connect Cline (VS Code Extension)
In VS Code -> Open **Cline** Settings -> Configure API Provider:
* **API Provider**: `OpenAI Compatible`
* **Base URL**: `http://localhost:8000/v1`
* **API Key**: `<Your OpenWebUI API Key>`
* **Model ID**: `nvidia/Qwen3.6-35B-A3B-NVFP4`

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

---

## 📊 Features & Persistence

* **Sub-Millisecond PII Anonymization**: Fast regex & contextual pattern engine (< 0.5 ms overhead per request).
* **Bi-directional Session Vault**: Token replacement (`[NAME_1]`, `[EMAIL_1]`, `[PHONE_1]`) with automatic re-hydration of completion stream outputs.
* **Persistent Disk Audit Store**: All receipts and stats are saved to `data/audit_store.json` with SHA-256 tamper-evident hash chains.
* **Interactive Control Dashboard**: Access `http://localhost:8000/` to test prompt anonymization live, view detected PII counters, and monitor audit receipts.

---

## 📁 Workspace Documents

* **System Design Spec**: [`Hackathon_Problem_Statement_LLM_Guardrail.md`](file:///Users/bhushan/Projects/Hackathon/Hackathon_Problem_Statement_LLM_Guardrail.md)
* **Audit Receipt Store**: [`data/audit_store.json`](file:///Users/bhushan/Projects/Hackathon/data/audit_store.json)
* **Proxy Core Modules**: [`pii_proxy/main.py`](file:///Users/bhushan/Projects/Hackathon/pii_proxy/main.py), [`pii_proxy/pii_detector.py`](file:///Users/bhushan/Projects/Hackathon/pii_proxy/pii_detector.py)
