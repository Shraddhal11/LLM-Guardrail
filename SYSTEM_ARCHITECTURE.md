# System Architecture: LLM/SLM Governance Runtime

This document details the system architecture split into two core operational setups:
1. **Single LLM / Single-Agent Architecture** (OpenAI-compatible Reverse Proxy & Direct Interception)
2. **Multi-Agent / Multi-LLM Architecture** (LangGraph Flow, Per-Agent Authority, and Handoff Gates)

---

## 1. Single LLM / Single-Agent Setup

In a single-agent scenario (e.g., direct Claude/GPT client or single LangChain agent), the runtime operates as an OpenAI-compatible reverse proxy sitting between the agent client and the upstream LLM provider, combined with wrapper gates for local tool execution.

```mermaid
flowchart TB
    subgraph SingleAgentEnv ["Single Agent Environment"]
        User["End User / App Client"]
        ClientApp["LangChain Agent / Application Code"]
        GovernedTool["@governed_tool Execution Wrapper"]
    end

    subgraph GovernanceProxy ["Governance Control Plane (Reverse Proxy)"]
        direction TB
        ProxyEndpoint["OpenAI-Compatible Reverse Proxy<br/>(/v1/chat/completions)"]
        
        subgraph CompliancePack ["Compliance Evaluator"]
            HIPAA_Pack["HIPAA Policy Pack<br/>(PHI Detection)"]
            DPDP_Pack["DPDP Policy Pack<br/>(PII Detection)"]
            RuleEngine["Rule Action Handler<br/>(Redact | Block | Hash | Log-Only)"]
        end

        subgraph ToolGate ["Execution Boundary Gate"]
            AuthCheck["Tool Threshold Evaluator<br/>(Score >= Tool Required Level)"]
        end

        subgraph AuditMeter ["Audit & Metering"]
            TokenMeter["Per-User Token Metering"]
            ReceiptGen["Signed Audit Receipt Generator"]
        end
    end

    subgraph Infrastructure ["External Services & Storage"]
        LLMProvider["Upstream LLM / SLM Provider<br/>(OpenAI, Anthropic, Ollama, etc.)"]
        ExternalTool["External Tool / DB / API"]
        AuditLedger[("Signed Audit Receipt Store")]
    end

    %% Flow: User to Agent
    User -->|"Prompt + user_id"| ClientApp

    %% Flow: LLM Request Interception
    ClientApp -->|"1. Inbound LLM Request"| ProxyEndpoint
    ProxyEndpoint -->|"2. Inspect Inbound Prompt"| CompliancePack
    CompliancePack -->|"3. Clean/Redacted Prompt"| ProxyEndpoint
    ProxyEndpoint -->|"4. Proxied Request"| LLMProvider
    LLMProvider -->|"5. Outbound Completion"| ProxyEndpoint
    ProxyEndpoint -->|"6. Inspect Completion"| CompliancePack
    CompliancePack -->|"7. Validated Completion"| ProxyEndpoint
    ProxyEndpoint -->|"8. Safe Response"| ClientApp

    %% Flow: Tool Interception
    ClientApp -->|"Invoke Tool Request"| GovernedTool
    GovernedTool -->|"Check Permission"| AuthCheck
    AuthCheck -->|"Allowed"| GovernedTool
    GovernedTool -->|"Execute Action"| ExternalTool

    %% Flow: Audit & Metering
    ProxyEndpoint -->|"Record Tokens & Log"| TokenMeter
    CompliancePack -->|"Log Rule Decision"| ReceiptGen
    AuthCheck -->|"Log Tool Decision"| ReceiptGen
    ReceiptGen -->|"Write Hash-Chained Receipt"| AuditLedger
```

---

## 2. Multi-Agent / Multi-LLM Setup

In a multi-agent graph (e.g., LangGraph with orchestrators and specialized sub-agents), full network transparency is insufficient. The governance runtime attaches directly to framework hooks to evaluate **per-agent compliance**, manage **live trust scores**, enforce **monotonic reduction**, and govern **agent-to-agent handoffs**.

```mermaid
flowchart TB
    subgraph MultiAgentGraph ["Multi-Agent Execution Graph (e.g., LangGraph)"]
        UserClient["User / Request Context"]
        Orchestrator["Orchestrator Agent<br/>(Trust Score: 100)"]
        
        subgraph SubAgents ["Specialized Sub-Agents"]
            AgentA["Sub-Agent A: Data Retriever<br/>(Trust Score: 85)"]
            AgentB["Sub-Agent B: Action Executor<br/>(Trust Score: 40)"]
        end

        ToolWrapper["@governed_tool Boundary Wrapper"]
    end

    subgraph MultiAgentGovernance ["Multi-Agent Governance Engine"]
        direction TB

        subgraph HandoffControl ["Agent Handoff Boundary Gate"]
            HandoffInspector["Handoff Payload Inspector<br/>(Agent-to-Agent Data Evaluation)"]
        end

        subgraph EarnedAuthorityEngine ["Earned-Authority Engine"]
            AgentScoreTracker["Per-Agent Live Trust Score Engine<br/>(Tracked per agent_id)"]
            MonotonicEngine["Monotonic Reduction Unit<br/>(Score drops on breach, cannot self-restore)"]
            GateCheck["Policy Gate Evaluator<br/>(Required Tool Score Check)"]
        end

        subgraph ComplianceEngine ["Compliance Engine"]
            PolicyPacks["HIPAA & DPDP Policy Packs"]
            ActionHandler["Compliance Action Evaluator"]
        end

        subgraph MultiAgentAttribution ["Attribution & Hash-Chain Engine"]
            AttrBuilder["Attribution Context Chain<br/>(user_id -> session_id -> agent_id -> parent_agent_id)"]
            ReceiptBuilder["Signed Audit Receipt Generator"]
        end
    end

    subgraph StorageAndDashboard ["Storage & Real-time Dashboard"]
        AuditLogDB[("Signed Audit Receipt Ledger")]
        TrustStateDB[("Per-Agent Trust State Store")]
        LiveDashboard["Live Real-Time Dashboard<br/>(Agent score curves, denied tool calls, violations)"]
    end

    %% Flow: User Initialization
    UserClient -->|"Initial Request (user_id, session_id)"| Orchestrator

    %% Handoff Flow: Orchestrator -> Sub-Agent A
    Orchestrator -->|"1. Delegate Sub-Task"| HandoffInspector
    HandoffInspector -->|"2. Validate Compliance"| PolicyPacks
    PolicyPacks -->|"3. Payload Cleared"| AgentA

    %% Sub-Agent A execution & tool call
    AgentA -->|"4. Execute Tool Request"| ToolWrapper
    ToolWrapper -->|"5. Evaluate Authority"| GateCheck
    GateCheck -->|"6. Query Agent Trust Score"| AgentScoreTracker
    GateCheck -->|"7. Allow Tool Execution"| ToolWrapper

    %% Sub-Agent A -> Sub-Agent B Handoff with Violation Scenario
    AgentA -->|"8. Handoff Payload to Agent B"| HandoffInspector
    HandoffInspector -->|"9. Detect PHI / Policy Violation"| ActionHandler
    ActionHandler -->|"10. Trigger Monotonic Reduction"| MonotonicEngine
    MonotonicEngine -->|"11. Drop Agent A Score (e.g., 85 -> 40)"| AgentScoreTracker

    %% Sub-Agent B Tool Gate Block Scenario
    AgentB -->|"12. Attempt High-Risk Tool"| ToolWrapper
    ToolWrapper -->|"13. Required Threshold: 70 | Current Score: 40"| GateCheck
    GateCheck --"14. DENIED (Insufficient Authority)"--> ToolWrapper
    ToolWrapper --"15. Return Blocked Error to Graph"--> AgentB

    %% Audit & Attribution Events
    HandoffInspector -->|"Emit Event"| AttrBuilder
    GateCheck -->|"Emit Event"| AttrBuilder
    MonotonicEngine -->|"Emit Event"| AttrBuilder
    AttrBuilder -->|"Format Attribution Envelope"| ReceiptBuilder
    ReceiptBuilder -->|"Write Receipt"| AuditLogDB
    AgentScoreTracker -->|"Persist Live Score"| TrustStateDB

    %% Dashboard Feed
    AuditLogDB --> LiveDashboard
    TrustStateDB --> LiveDashboard
```

---

## 3. Comparison of Setups

| Aspect | Single LLM / Single-Agent Setup | Multi-Agent / Multi-LLM Setup |
| :--- | :--- | :--- |
| **Primary Interception Point** | OpenAI-compatible Reverse Proxy (`/v1/chat/completions`) | Framework Callbacks / LangGraph State Hooks + `@governed_tool` |
| **Attribution Scope** | `user_id` $\rightarrow$ `session_id` | `user_id` $\rightarrow$ `session_id` $\rightarrow$ `agent_id` $\rightarrow$ `parent_agent_id` |
| **Authority Tracking** | Single session score baseline | Distinct live trust scores per `agent_id` within the session |
| **Handoff Inspection** | N/A (Single agent flow) | Intercepts agent-to-agent payload transfers before receiver execution |
| **Score Penalty Model** | Input/output compliance penalization | Monotonic reduction per specific offending agent |
| **Tool Gating** | Pre-tool check on global session score | Pre-tool check against specific acting `agent_id`'s trust score |
