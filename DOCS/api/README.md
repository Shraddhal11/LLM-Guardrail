# API docs

One file per endpoint group. Added as each endpoint is built.

| File | Covers |
|---|---|
| `proxy.md` | The LLM proxy: chat completions, headers, session rules, handling modes, token counts |
| `dashboard_data.md` | Data for the dashboards: me, action mode, sessions, events, tokens, stats, admin lists |
| `sessions_agents.md` | Session and agent model, agent endpoint |

Endpoints that existed before these files (the playground `/api/test-inspect`, user sync `/api/users/sync`, and the OpenAI-compatible `/v1/models` and `/v1/embeddings`) are not documented yet.

Each entry lists its method and path, auth, parameters or body, response, and one example.
