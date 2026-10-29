# C3 — Component — FastAPI Master Orchestrator

> **Purpose:** Zoom into the FastAPI Master Orchestrator container and detail its internal modular components, service boundaries, and dependency flows.

```mermaid
flowchart TB
    subgraph rt["FastAPI Master Orchestrator [Container]"]
        direction TB
        api["HTTP API & Routers<br/><i>[Component: FastAPI]</i><br/>REST endpoints, request validation,<br/>JSON serialization, and problem details"]
        identity["Identity & Access<br/><i>[Component: Core Security]</i><br/>Login, HMAC-SHA256 tokens, RBAC,<br/>and PBKDF2 password hashing"]
        dagEngine["DAG Engine<br/><i>[Component: Domain Engine]</i><br/>Topological sort, Kahn cycle detection,<br/>and dependency resolution"]
        executionMgr["Execution State Machine<br/><i>[Component: Service]</i><br/>Instance lifecycle, task state transitions,<br/>step advancement, and retry policy"]
        queueDispatcher["Queue Dispatcher<br/><i>[Component: Service]</i><br/>Worker polling, 5-lane queue routing,<br/>heartbeat monitoring, and slot allocation"]
        aiService["AI Copilot Service<br/><i>[Component: Service]</i><br/>Prompt-to-DAG schema generation<br/>and failure root-cause diagnostics"]
        auditLog["Audit Trail<br/><i>[Component: Service]</i><br/>Immutable action logging for compliance"]
        persistence["Persistence Layer<br/><i>[Component: Storage Adapter]</i><br/>In-memory, SQLite & PostgreSQL repositories"]
    end

    web["Web Console<br/><i>[Container: React 18 SPA]</i>"]
    db[("Database<br/><i>[Container: SQLite / PostgreSQL]</i>")]
    workerNodes["Distributed Workers<br/><i>[External Cluster]</i>"]
    llmEngine[("AI LLM Service<br/><i>[External API]</i>")]

    web --> api
    api --> identity
    api --> dagEngine
    api --> executionMgr
    api --> queueDispatcher
    api --> aiService
    api --> auditLog

    executionMgr --> dagEngine
    executionMgr --> persistence
    queueDispatcher --> executionMgr
    queueDispatcher --> persistence
    queueDispatcher <--> workerNodes
    aiService --> llmEngine
    identity --> persistence
    auditLog --> persistence
    persistence --> db

    style api fill:#1168bd,color:#fff
    style identity fill:#1168bd,color:#fff
    style dagEngine fill:#0b4f9e,color:#fff
    style executionMgr fill:#0b4f9e,color:#fff
    style queueDispatcher fill:#1168bd,color:#fff
    style aiService fill:#1168bd,color:#fff
    style auditLog fill:#1168bd,color:#fff
    style persistence fill:#1168bd,color:#fff
```

## Component Catalog

| Component | Source Path | Primary Ownership | Excluded / Does Not Own |
|---|---|---|---|
| **HTTP API & Routers** | `app/api/` | HTTP status codes, OpenAPI schema, DTO validation, REST routing. | Database transactions or workflow logic. |
| **Identity & Access** | `app/core/security.py` | Bearer token creation/verification, password hashing, RBAC role guard. | UI display decisions. |
| **DAG Engine** | `app/domain/dag_engine.py` | Graph validation, in-degree calculation, Kahn's topological sort, cycle detection. | Runtime state or database persistence. |
| **Execution State Machine** | `app/services/execution_service.py` | Instance transitions (`RUNNING`, `COMPLETED`, `FAILED`, `CANCELLED`), task advancement, retries. | Low-level HTTP requests. |
| **Queue Dispatcher** | `app/services/worker_service.py` | 5 priority queues (`default`, `compute`, `data-io`, `payment`, `ai-agent`), worker heartbeat, task polling. | Direct DAG graph validation. |
| **AI Copilot Service** | `app/services/ai_service.py` | LLM prompt engineering, Prompt-to-DAG JSON schema synthesis, log root cause analysis. | Executing tasks. |
| **Audit Trail** | `app/domain/models.py` | Recording security events, triggers, cancellations, and DAG modifications. | Modifying workflow states. |
| **Persistence Layer** | `app/persistence/` | Relational SQLite/PostgreSQL schemas, transactions, unified store abstraction. | Business decision making. |

## Inter-Component Dependency Flow

1. **DAG Creation Flow:** `HTTP API → Identity (Verify RBAC) → DAG Engine (validate_dag via Kahn) → Persistence → DB`.
2. **Trigger Execution Flow:** `HTTP API → Execution Service → DAG Engine (get_root_steps) → Persistence (create instance & tasks) → Queue Dispatcher`.
3. **Task Completion Flow:** `Worker Node → Queue Dispatcher → Execution Service (advance_instance) → DAG Engine (get_next_steps) → Persistence`.
4. **AI Self-Healing Flow:** `HTTP API → AI Service (diagnose_failure with task error log) → Return Root Cause & Fix Recommendation`.

**Previous:** [C2 — Container](02-container.md) · **Next:** zoom into the Core Engines → [C4 — Code](04-code.md).
