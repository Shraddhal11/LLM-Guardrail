# Sessions and agents

## Model
- **Session**: one task or conversation, owned by one user.
- **Agent**: a named caller inside a session (for example `orchestrator`, `intake_agent`). An agent may have a parent agent.
- **Event**: one request. Belongs to a session and, when known, to an agent.

## GET `/api/sessions/{session_id}/agents`
Agents in one session. Owner or admin.
```json
[{"agent_name": "comms_agent", "parent_agent_name": "orchestrator", "initial_score": 100, "requests": 4, "violations": 1}]
```
`initial_score` is fixed at 100 until agent scoring is built (see Phase 7).
