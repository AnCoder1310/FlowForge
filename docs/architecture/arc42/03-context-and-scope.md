# 3. Context and Scope

The context defines the external actors, worker nodes, external services, and platform boundaries of FlowForge (DWOP).

```mermaid
flowchart LR
    admin(["👤 Administrator"])
    operator(["👤 Operations Lead"])
    dev(["👤 Workflow Developer"])
    viewer(["👤 Platform Observer"])

    subgraph boundary["FlowForge Platform Boundary"]
        dwop["FlowForge (DWOP)<br/><i>[Distributed Orchestrator]</i><br/>Validates DAG cycles, dispatches tasks,<br/>monitors workers, and runs AI diagnostics."]
    end

    workers["Distributed Worker Nodes<br/><i>[Compute, IO, AI Workers]</i>"]
    llm["AI Engine / LLM Service<br/><i>[Prompt-to-DAG & Diagnostics]</i>"]

    admin --> dwop
    operator --> dwop
    dev --> dwop
    viewer --> dwop

    dwop <--> workers
    dwop <--> llm

    style dwop fill:#1168bd,color:#fff
```

## System Boundary

### Inside FlowForge
- DAG schema validation and topological sort (Kahn's algorithm).
- Workflow instance execution state machine.
- 5 isolated task dispatch queues.
- Worker heartbeat monitoring and slot allocation.
- AI Prompt-to-DAG and failure diagnostics.
- Role-based authorization and immutable audit trail.

### Outside FlowForge
- Physical or virtual server infrastructure running worker processes.
- External OpenAI / LLM provider API.
- Customer third-party services invoked by tasks (Slack, external REST webhooks).
