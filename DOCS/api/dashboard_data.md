# Dashboard data endpoints

All endpoints need `Authorization: Bearer <Clerk session token>`. Users see their own data. Admins see everything. Requests for another user's data return 403.

## GET `/api/me`
Your profile. Used to decide which view to show.
Response: `{ id, email, name, user_uuid, role, action_mode }`. `action_mode` is `null` when you use the global default.

## PUT `/api/users/{user_uuid}/action-mode`
Set how your PII is handled. Owner or admin.
Body: `{ "mode": "REDACT" }`. Send `{ "mode": null }` to go back to the global default.
Valid modes: `ANONYMIZE`, `REDACT`, `HASH`, `BLOCK`, `LOG_ONLY`. Anything else returns 400.

## GET `/api/users/{user_uuid}/sessions`
Your sessions, newest first. Owner or admin.
Each item: `session_id, external_id, started_at, last_seen_at, requests, violations, agents`.

## GET `/api/sessions/{session_id}/events`
Every request in one session, oldest first. Owner or admin.
Each item is the same shape as `GET /api/events/{event_id}`.

## GET `/api/events/{event_id}`
One request, for the before/after view. Owner or admin.
| Field | Meaning |
|---|---|
| `original_text` | Before: the prompt as sent |
| `anonymized_text` | After: what the model received (only stored when redacted) |
| `decision` | `allow`, `redact`, `block`, or `deny` |
| `reason` | Plain-language explanation of the decision |
| `findings` | Each detected item: `entity_type`, `category`, `placeholder`, `confidence` |
| `prompt_tokens`, `completion_tokens`, `tokens_estimated` | Token counts |
| `latency_ms`, `model`, `action_mode`, `agent_name` | Details |

## GET `/api/users/{user_uuid}/queries?limit=50`
Recent requests for one user, newest first. Owner or admin. `limit` is the number of rows (default 50).
Each item includes `id` (the event ID, usable with `/api/events/{id}`), `session_id`, `decision`, `categories_found`, `original_prompt`, `anonymized_prompt`, token counts.

## GET `/api/users/{user_uuid}/tokens`
Token totals. Owner or admin.
```json
{
  "latest_session": {"session_id": "...", "external_id": "...", "prompt_tokens": 120, "completion_tokens": 40, "total_tokens": 160, "requests": 3},
  "average_tokens_per_session": 812.5,
  "average_tokens_per_request": 210.0,
  "total_tokens": 4875,
  "total_requests": 23
}
```

## GET `/api/users/{user_uuid}/daily?days=14`
Requests and violations per day. Owner or admin. Violations are redacted or blocked requests.

## GET `/api/stats?user_uuid=...`
Totals for one user, or for everyone when `user_uuid` is omitted (admin only).
Fields: `total_requests`, `total_pii_detected`, `category_counts`, `action_counts`, `decision_counts`.

## Admin only

### GET `/api/admin/users`
Every user with `requests, pii_detected, violations, top_category, last_active`.

### GET `/api/admin/activity?limit=50`
Most recent requests across all users, newest first. `limit` is the number of rows. Each item includes `event_id` and `session_id`, so it can be opened with `/api/events/{event_id}`.

### GET `/api/admin/sessions`
Every session across all users, with `user_email`.
