# Proxy (LLM traffic)

The proxy is OpenAI-compatible. Point any OpenAI-style client at your personal proxy link. Every request is checked for PII, handled according to your setting, recorded, and then forwarded to the model.

## POST `/proxy/{user_uuid}/v1/chat/completions`

Also available without `/proxy/{user_uuid}` (then the user is `default_user`).

**Path**
| Name | Required | Description |
|---|---|---|
| `user_uuid` | yes (in the proxy link) | Your user ID. Shown on the dashboard. |

**Headers**
| Header | Required | Description |
|---|---|---|
| `Authorization` | yes | Your model provider key, e.g. `Bearer <key>`. Passed through, never stored. |
| `X-Session-ID` | no | Groups requests into one session. Use it in code (LangGraph, scripts). |
| `X-Agent-ID` | no | Name of the agent making the call. Default `default`. |
| `X-Parent-Agent-ID` | no | Name of the agent that called this one. Creates a parent link. |
| `X-Action-Mode` | no | Overrides your handling setting for this request. One of `ANONYMIZE`, `REDACT`, `HASH`, `BLOCK`, `LOG_ONLY`. |

**Session choice (when `X-Session-ID` is not sent)**
- Chat clients that resend their history (Cline, Open WebUI): the session is fixed by a fingerprint of the first user message, so each task is one session.
- Clients that send only the latest message: each message becomes its own session. Send `X-Session-ID` for those.

**Body**: standard OpenAI chat body (`model`, `messages`, `stream`, ...).

**Handling** (what happens to PII in the latest user message)
| Mode | Effect | Response |
|---|---|---|
| `ANONYMIZE` | Replaced with placeholders like `[NAME_1]`; restored in the reply | normal |
| `REDACT` | Replaced with `[REDACTED_<TYPE>]` | normal |
| `HASH` | Replaced with `<TYPE:hash>` | normal |
| `BLOCK` | Not sent to the model | HTTP 400, `code: pii_blocked` |
| `LOG_ONLY` | Sent unchanged, recorded | normal |

**Example**
```bash
curl -X POST http://localhost:8000/proxy/usr_77256c3f/v1/chat/completions \
  -H "Authorization: Bearer <your-model-key>" \
  -H "Content-Type: application/json" \
  -H "X-Session-ID: langgraph-run-42" \
  -H "X-Agent-ID: comms_agent" \
  -H "X-Parent-Agent-ID: orchestrator" \
  -d '{"model":"nvidia/Qwen3.6-35B-A3B-NVFP4","messages":[{"role":"user","content":"Email the note for SSN 123-45-6789"}]}'
```

**Token counts** are stored with the request. Non-streamed replies use the provider's `usage` numbers. Streamed replies are estimated from text length (about 4 characters per token) and marked as estimated.

**Errors**
| Status | When |
|---|---|
| 400 | Blocked by PII policy (`code: pii_blocked`) |
| 502 | Upstream model unreachable |
| other | Passed through from the upstream provider |
