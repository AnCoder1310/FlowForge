# 12. Glossary — FlowForge (DWOP)

| Term | Definition |
|---|---|
| **DAG (Directed Acyclic Graph)** | A finite directed graph with no directed cycles. In FlowForge, workflows are modeled as DAGs where nodes are tasks and directed edges represent dependencies (`dependsOn`). |
| **Kahn's Algorithm** | A topological sorting algorithm that operates in $O(V + E)$ time by repeatedly removing nodes with an in-degree of 0. Used to detect cycles and validate workflows before execution. |
| **Workflow Definition** | The blueprint/schema of a DAG containing step metadata, task types, retry policies, and assigned queues. |
| **Workflow Instance** | A concrete execution run of a workflow definition with distinct runtime inputs, state, and timeline. |
| **Task Execution** | An individual step run within an instance, tracking its assigned worker, retry count, status, and output payload. |
| **Worker Node** | A distributed compute or I/O daemon that polls tasks from supported queues, executes them, and reports results. |
| **Queue Isolation** | Partitioning tasks into 5 dedicated queues (`default`, `compute`, `data-io`, `payment`, `ai-agent`) to prevent starvation. |
| **AI Prompt-to-DAG** | Using LLM AI to convert natural-language process descriptions directly into valid DAG definitions. |
| **AI Failure Self-Healing** | Automated diagnosis that analyzes error traces of failed tasks to identify root cause and prescribe remediation. |
| **RBAC (Role-Based Access Control)** | Authorization model restricting operations by user role (`ADMIN`, `OPERATOR`, `DEVELOPER`, `VIEWER`). |
| **Audit Trail** | An append-only immutable log recording all security-relevant and orchestration actions. |
