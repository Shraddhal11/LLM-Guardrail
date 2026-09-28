**Compliance \+ Earned-Authority Governance Runtime for SLM/LLM Agents**

*Problem Statement*

# 1\. Problem Statement

Organizations deploying local SLMs/LLMs — especially as autonomous or semi-autonomous agents that call tools, mutate data, or trigger actions — face three related but distinct governance gaps:

* **Data compliance gap:** No standardized way to guarantee sensitive data (PHI under HIPAA, personal data under DPDP, etc.) doesn't leak into prompts or come back out in completions.

* **Execution authority gap:** No standardized way to guarantee an agent only takes actions it has currently earned the right to take. Agent permissions are static (RBAC-style), so a prompt-injected or misbehaving agent retains full tool access even after acting suspiciously, with no infrastructure-level proof of what it was actually authorized to do.

* **User accountability gap:** No per-user visibility into how LLM access is actually used — token consumption, trustworthiness of usage patterns, and effective vs. wasteful use.

Build a unified runtime governance layer — a single execution control plane — that sits between any SLM/LLM agent and (a) the data it consumes/produces, (b) the tools/actions it's allowed to invoke, and (c) the user account behind each request.

## Integration Model

The runtime is not a transparent, silently-intercepting network proxy. It is a governance endpoint that must be explicitly integrated into the agent's code path:

* For a single upstream LLM call (e.g., an app calling Claude/GPT directly), the integration can sit as a reverse proxy in front of that one call, and can behave close to transparently for the caller.

* For a multi-agent system, full transparency isn't achievable — the runtime must be wired in by the solution builder using the framework's own hook points (e.g., LangChain/LangGraph callback handlers) so that every tool call and every agent-to-agent handoff triggers a call to the governance endpoint before/after execution. This keeps the integration surface simple and demonstrable within the hackathon timeframe, rather than attempting a fully generic network-level interception layer.

## Per-Agent Scoring in Multi-Agent Flows

In a multi-agent system, compliance and authority are evaluated per agent, not just per session:

* Each agent's input and output is checked independently against the active compliance pack (HIPAA/DPDP).

* Each agent carries its own trust/authority score. A violation degrades that specific agent's score.

* Degraded agent scores roll up so that if enough agents (or one agent severely) violate policy, the overall output can be blocked with an explicit reason (e.g., “output blocked: not HIPAA-compliant”).

Compliance answers “is this data allowed to cross the boundary?”; earned authority answers “is this action still allowed to happen right now, given what this agent has actually proven?”; user monitoring answers “who is behind this, and what does their track record say?” All three are enforced at the same execution boundary and share the same evidence stream.

# 2\. Core Concepts

* **Evidence-Based Boundaries:** Authority to call a tool is granted based on verified proof of prior correct behavior, not just the LLM's self-reported claim that a step “succeeded.”

* **Dynamic Metering:** Unlike static RBAC, the agent's allowed action set is continuously recalculated against a live trust score, task scope, and risk level.

* **Policy Gates at the Execution Boundary:** Every tool call and every prompt/completion is checked immediately before it's allowed to proceed — never trusted based on model output alone.

* **Monotonic Reduction:** If anomalous behavior, compliance violations, or failed validations are detected, the agent's authority can only contract, never silently stay the same or self-restore without a fresh evidence trail.

* **Signed Receipts:** Every allowed or denied action produces a tamper-evident, auditable record.

* **Per-User Accountability:** Authority and compliance evidence are tracked not just per-session but per-user, rolling up into a persistent profile — turning the runtime from a pure security control into a usage-governance and analytics layer as well.

The Earned-Authority model is a core differentiator of this solution and remains fully in scope. A dedicated walkthrough of this concept will be given to the team leads alongside the compliance model, since it is the piece most likely to need extra explanation.

# 3\. Objectives

| \# | Objective | Priority |
| :---- | :---- | :---- |
| 1 | Intercept and inspect every prompt (inbound) and completion (outbound) for compliance violations (HIPAA pack) | Must-have |
| 2 | Apply configurable compliance actions: redact / block / hash / log-only | Must-have |
| 3 | Intercept every tool-call/action request from the agent at the execution boundary (before it runs) | Must-have |
| 4 | Intercept every agent-to-agent handoff in a multi-agent flow and evaluate that agent's output independently before it is passed on | Must-have |
| 5 | Maintain a live trust/authority score per agent within a session (not just per session) | Must-have |
| 6 | Enforce policy gates: a tool call is allowed only if the current authority score clears that tool's required threshold | Must-have |
| 7 | Implement monotonic reduction: authority score can only decrease on violation/anomaly, never silently reset upward without new evidence | Must-have |
| 8 | Generate a signed/hash-chained audit receipt for every compliance decision AND every authority decision, attributable to the specific agent\_id that produced it | Must-have |
| 9 | Be model-agnostic and tool-framework-agnostic; demonstrated concretely against LangChain (single-agent) and LangGraph (multi-agent) via their native callback/hook mechanisms | Must-have |
| 10 | Second compliance policy pack: DPDP (India) — map the overlap between HIPAA and DPDP identifier/handling rules | Must-have |
| 11 | Simple dashboard showing live authority score trend \+ compliance violations \+ denied tool calls, broken out per agent\_id | Must-have |
| 12 | Per-user token usage tracking across all requests | Must-have |
| 13 | Persistent user profile with composite rating (authority-trust, violation frequency, effective-use score) | Must-have |
| 14 | Per-user dashboard view | Must-have |
| 15 | Latency/overhead benchmarking — the solution must be fast and lightweight so it doesn't visibly slow down LLM/SLM usage | Must-have |

# 4\. Non-Goals

* Legal certification or formal compliance sign-off

* Full coverage of every HIPAA identifier category — scoping to \~8–10 high-signal ones

* A general-purpose, pluggable tool-calling framework — the runtime is demonstrated against whatever tool surface the assigned reference repo already exposes, not a bespoke toolset built for this hackathon

* Cryptographically rigorous signing (hash-chaining only)

* Real anomaly-detection ML — rule-based evidence signals only

* Sophisticated “effective use” semantics — simple, transparent proxies only

* User authentication/identity management — user\_id passed in with each request

* A fully transparent, network-level, zero-integration proxy for arbitrary multi-agent systems. The demo integration is done via framework callbacks (LangChain/LangGraph), not via traffic interception at the network layer.

# 5\. Deliverables

The team submits/demos at the end of the hackathon:

* Working runtime (code): the OpenAI-compatible reverse proxy (LLM interception) and @governed\_tool wrapping applied to the tools already exposed by the assigned reference repo, running end-to-end against at least one real or scripted multi-agent flow (an orchestrator delegating to ≥2 sub-agents).

* Compliance policy packs: HIPAA pack (Must-have, \~8–10 high-signal identifiers) and DPDP pack (Should-have), each demonstrating redact / block / hash / log-only actions, with the overlap between the two mapped out.

* Authority engine: live per-agent trust scoring, policy gates with per-tool thresholds, monotonic reduction, and delegation capping — visibly enforced, not just computed and logged.

* Signed/hash-chained audit trail: a receipt for every compliance and authority decision, each carrying the full attribution chain (user\_id → session\_id → agent\_id → parent\_agent\_id), exportable or queryable for the demo.

* Per-user profile store: persistent token usage, composite trust rating, and effective-use proxy per user\_id, aggregated across all agents and sessions acting on that user's behalf.

* Dashboard: live authority score trend, compliance violations, and denied tool calls — broken out per agent\_id within a session — plus the per-user view (token usage over time, rating trend, violation history).

* A written integration contract describing exactly how a LangChain agent and a LangGraph multi-agent graph attach to the governance runtime via callbacks — this is what will be handed to the other three teams so their reference use cases can plug in.

* Demo script covering a worked example: a benign agent action succeeding, a violation being caught and redacted, and an out-of-scope action being denied, with the dashboard and receipts reflecting all three correctly attributed to the right agent\_id — demonstrated against the four standardized use cases (Section 6), using use cases built by other teams as well as the team's own.

* Short write-up: architecture diagram, the identity-envelope contract any team could implement against, and an explicit list of what's mocked/simplified vs. production-grade.

* Latency/overhead numbers (Nice-to-have): rough before/after comparison showing the proxy's added latency per LLM call and per tool call.

# 6\. Cross-Team Testing Setup

To enable consistent testing across all four hackathon teams:

* Each of the four teams builds one reference agent/use case:

  * Multi-agent system on LangGraph

  * Single-agent system on LangChain

  * A chat interface

  * A RAG interface

* Ready-made/open-source implementations may be used instead of building from scratch, where available, to save time.

* Each team shares its reference use case with the other three teams, so every team's governance runtime is tested against the same pool of four standardized agents — rather than each team only validating against its own use case.

* The four reference use cases should collectively span both healthcare data (HIPAA) and general PII data (DPDP), so the compliance layer is exercised against both packs.

# Summary

**1\. I/O-level guardrailing:** What goes into the LLM and what comes out is checked as a HIPAA and DPDP compliance guardrail.

**2\. Per-agent enforcement in multi-agent systems:** At each agent level, the system checks whether that agent is complying. Any agent that violates a rule takes a hit to its own trust score; if a threshold is breached, the final output is blocked with an explicit “not compliant” reason rather than silently passed through.

