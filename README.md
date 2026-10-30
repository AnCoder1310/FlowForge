# FlowForge — Distributed Workflow Orchestration Platform (DWOP)

[![Python 3.10+](https://img.shields.io/badge/Python-3.10%2B-blue.svg?logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115%2B-009688.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React 18](https://img.shields.io/badge/React-18.3-61DAFB.svg?logo=react&logoColor=black)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-5.0-646CFF.svg?logo=vite&logoColor=white)](https://vitejs.dev)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC.svg?logo=tailwind-css&logoColor=white)](https://tailwindcss.com)
[![Pytest Tests](https://img.shields.io/badge/Pytest-31%2F31%20Passed-success.svg?logo=pytest&logoColor=white)](src/backend/tests/)
[![Vitest Tests](https://img.shields.io/badge/Vitest-27%2F27%20Passed-success.svg?logo=vitest&logoColor=white)](src/frontend/)
[![OpenAPI 3.1](https://img.shields.io/badge/OpenAPI-3.1%20Contract-green.svg?logo=openapi-initiative&logoColor=white)](docs/api/openapi.yaml)

**FlowForge DWOP** is an enterprise-grade distributed workflow orchestration engine and developer console built for high-throughput, mission-critical engineering pipelines. It coordinates multi-step workflows as **Directed Acyclic Graphs (DAG)**, guarantees cycle-free execution via **Kahn's Topological Algorithm**, provides **Conditional Branching** with automatic `SKIPPED` state cascading, dispatches asynchronous tasks across **5 isolated worker queues**, and delivers **AI Prompt-to-DAG** generation and self-healing root-cause diagnostics powered by **9Router AI**.

---

## 1. Requirements — INVEST, Use Cases, and Acceptance Criteria

Requirements define what FlowForge must do, who uses it, the value delivered, and the observable conditions of success. User stories are reviewed with INVEST and mapped to use cases and acceptance criteria.

### 1.1 Product mind map

![FlowForge Mind Map](docs/images/admin/mindmap.png)

### 1.2 INVEST requirements

The V1-V2 backlog includes 13 core user stories. These stories cover authentication, cluster dashboard, workflow DAG definition, AI prompt-to-DAG generation, execution triggering, real-time step progress tracking, execution cancellation, AI failure diagnosis and self-healing, worker queue monitoring, audit logs, user RBAC, personal profile management, and production-ready conditional branching.
Before a user story is ready for development, it is checked using the INVEST criteria.

| Criterion | Meaning in FlowForge Distributed Workflow Orchestration Platform |
|---|---|
| **Independent** | Each story provides a distinct capability (e.g. DAG cycle validation is independent of worker polling; conditional branching cascades without blocking other branches). |
| **Negotiable** | UI layouts and visualization formats can evolve as long as core orchestration invariants, state machine transitions, and RBAC rules remain intact. |
| **Valuable** | Delivers concrete operational efficiency to SREs, DevOps leads, data engineers, and platform administrators. |
| **Estimable** | Roles, inputs, outputs, queue routing, retry policies, and failure outcomes are explicitly documented. |
| **Small** | Each story covers one primary capability and decomposes cleanly into API, domain engine, worker dispatcher, UI, and test tasks. |
| **Testable** | Every story maps to observable acceptance criteria verified via 31 automated Pytest backend tests and 27 Vitest frontend tests. |

```text
US01–US02   Authentication and session lifecycle (PBKDF2 + HMAC-SHA256)
US03        Cluster telemetry, queue depth, and executive dashboard
US04–US05   Workflow DAG definitions, Kahn cycle check, and 9Router Prompt-to-DAG
US06–US08   Execution triggering, step progress, conditional branching & cancellation
US09        AI failure diagnostics and automated self-healing recommendations
US10        Distributed worker fleet, atomic claiming, and 5-lane queue isolation
US11        Immutable audit trail and compliance logging (7 action types)
US12        User management and 4-tier RBAC policy
US13        Personal profile, self-service password reset, and permissions matrix
```

All stories have estimable target behavior: DAG cycle validation is deterministic via Kahn's algorithm, task dispatching is isolated across 5 queues, and execution state machine transitions are atomic. The complete story-level review is maintained in [INVEST Requirements](docs/08-invest-requirements.md).

### 1.3 Use cases

FlowForge organizes capabilities across 14 discrete use cases (`UC01` to `UC14`) mapped to 4 operational roles:

```mermaid
flowchart TB
    subgraph actors["System Actors"]
        direction LR
        admin(["Administrator"]):::actorPill
        operator(["Operations Lead"]):::actorPill
        dev(["Workflow Developer"]):::actorPill
        viewer(["Platform Observer"]):::actorPill
    end

    subgraph dwopBoundary["FlowForge — System Boundary (Role-Based Use Case Allocation)"]
        direction LR

        cardAdmin["<b>Administrator</b><br/><br/>• <b>UC01</b> Login (PBKDF2 + Demo)<br/>• <b>UC02</b> Logout<br/>• <b>UC03</b> View Dashboard & Telemetry<br/>• <b>UC04</b> View Workflow DAGs & Studio<br/>• <b>UC05</b> Define DAG & Conditions<br/>• <b>UC06</b> 9Router AI Prompt-to-DAG<br/>• <b>UC07</b> Trigger Workflow Run<br/>• <b>UC08</b> Track Step Progress & SKIPPED<br/>• <b>UC09</b> Cancel Execution Run<br/>• <b>UC10</b> AI Failure Diagnostics<br/>• <b>UC11</b> Monitor Workers & 5 Queues<br/>• <b>UC12</b> Security Audit Trail<br/>• <b>UC13</b> Profile & Password Self-Service<br/>• <b>UC14</b> Manage Users & RBAC Matrix"]:::colCard

        cardOp["<b>Operations Lead</b><br/><br/>• <b>UC01</b> Login (PBKDF2 + Demo)<br/>• <b>UC02</b> Logout<br/>• <b>UC03</b> View Dashboard & Telemetry<br/>• <b>UC04</b> View Workflow DAGs & Studio<br/>• <b>UC05</b> Define DAG & Conditions<br/>• <b>UC07</b> Trigger Workflow Run<br/>• <b>UC08</b> Track Step Progress & SKIPPED<br/>• <b>UC09</b> Cancel Execution Run<br/>• <b>UC10</b> AI Failure Diagnostics<br/>• <b>UC11</b> Monitor Workers & 5 Queues<br/>• <b>UC12</b> Security Audit Trail<br/>• <b>UC13</b> Profile & Password Self-Service"]:::colCard

        cardDev["<b>Workflow Developer</b><br/><br/>• <b>UC01</b> Login (PBKDF2 + Demo)<br/>• <b>UC02</b> Logout<br/>• <b>UC03</b> View Dashboard & Telemetry<br/>• <b>UC04</b> View Workflow DAGs & Studio<br/>• <b>UC05</b> Define DAG & Conditions<br/>• <b>UC06</b> 9Router AI Prompt-to-DAG<br/>• <b>UC07</b> Trigger Workflow Run<br/>• <b>UC08</b> Track Step Progress & SKIPPED<br/>• <b>UC10</b> AI Failure Diagnostics<br/>• <b>UC11</b> Monitor Workers & 5 Queues<br/>• <b>UC13</b> Profile & Password Self-Service"]:::colCard

        cardViewer["<b>Platform Observer</b><br/><br/>• <b>UC01</b> Login (PBKDF2 + Demo)<br/>• <b>UC02</b> Logout<br/>• <b>UC03</b> View Dashboard & Telemetry<br/>• <b>UC04</b> View Workflow DAGs (Read-only)<br/>• <b>UC08</b> Track Step Progress (Read-only)<br/>• <b>UC11</b> Monitor Workers & Queues (Read-only)<br/>• <b>UC13</b> Profile & Password Self-Service"]:::colCard
    end

    admin --> cardAdmin
    operator --> cardOp
    dev --> cardDev
    viewer --> cardViewer

    classDef actorPill fill:#334155,color:#ffffff,stroke:#64748b,stroke-width:2px;
    classDef colCard fill:#1d4ed8,color:#ffffff,stroke:#60a5fa,stroke-width:2px;
```

For detailed actors, permissions, and business flows, see [Actors, roles, and use cases](docs/03-use-cases.md).

### 1.4 Roles and permissions

| Capability | Admin | Operations Lead | Developer | Viewer |
|---|---|---|---|---|
| View dashboard & telemetry | Yes | Yes | Yes | Yes |
| View DAGs & Visual Studio | Yes | Yes | Yes | Yes |
| Define & edit DAG workflows | Yes | Yes | Yes | No |
| AI Prompt-to-DAG generator | Yes | No | Yes | No |
| Trigger workflow runs | Yes | Yes | Yes | No |
| Cancel running executions | Yes | Yes | No | No |
| AI failure diagnostics (Self-Healing) | Yes | Yes | Yes | No |
| View worker nodes & 5 queues | Yes | Yes | Yes | Yes |
| Security audit trail (7 actions) | Yes | Yes | No | No |
| User directory & RBAC assignment | Yes | No | No | No |
| Personal profile & password reset | Yes | Yes | Yes | Yes |

The backend enforces RBAC on every API endpoint; hiding frontend controls serves UI/UX only.

---

## 2. Information Architecture, Screen Hierarchy, and UI/UX

The information architecture organizes the authenticated workspace by orchestration capability. Screen permissions and navigation follow the role matrix, while loading, empty, validation, error, saving, and success states are defined consistently.

### 2.1 Information architecture

#### Relume Sitemap
![Relume Sitemap](docs/images/admin/sitemap.png)

```text
Public Layer
└── /login (Xác thực tài khoản & 4 tài khoản Demo một chạm)

Authenticated Workspace (Shell Layout: Sidebar cố định 260px + Header sticky 68px)
├── [ORCHESTRATION ENGINE]
│   ├── /dashboard          - Giám sát Telemetry, cụm chỉ số KPI & Kích hoạt nhanh
│   ├── /workflows          - Danh mục DAG, Visual Mini-Pipeline & AI Prompt-to-DAG Copilot
│   │   └── /workflows/studio - Visual DAG Builder Studio (Drag-and-Drop Canvas)
│   ├── /executions         - Quản trị lượt chạy, Timeline từng bước, Trạng thái SKIPPED & AI Self-Healing
│   └── /workers            - Cụm Worker Nodes, Concurrency Slots & 5 Hàng đợi Phân tán
│
├── [GOVERNANCE & ADMIN]
│   ├── /audit              - Nhật ký kiểm toán bảo mật bất biến (Security Audit Trail)
│   ├── /users              - Danh bạ tài khoản & Ma trận phân quyền 4 vai trò RBAC
│   └── /profile            - Hồ sơ kỹ sư, Đổi mật khẩu & Thanh tra quyền hạn
│
└── [SYSTEM EXCEPTION]
    └── /403                - Màn hình từ chối truy cập (Access Denied / Forbidden)
```

### 2.2 Screen hierarchy

Login leads to the authenticated shell. The shell owns navigation to feature pages; workflow definition, execution triggering, and AI generation interactions use feature-owned modals. Unauthorized navigation resolves to the Forbidden screen.

Detailed screen IDs, user flows, screen states, accessibility rules, and API mappings are maintained in [Information Architecture](docs/04-information-architecture.md).

### 2.3 Current UI prototype

#### 1. Platform Dashboard & Telemetry
![Platform Dashboard](docs/images/admin/01-dashboard.png)

#### 2. Workflows & DAG Definitions
![Workflows & DAG Definitions](docs/images/admin/DAG.png)

#### 3. Executions & Step Lifecycle
![Executions & Step Lifecycle](docs/images/admin/run.png)

#### 4. Worker Nodes & Task Queues
![Worker Nodes & Task Queues](docs/images/admin/workers.png)

---

## 3. C4 Architecture

FlowForge follows the **C4 Model** for software architecture to communicate structural design across multiple levels of abstraction.

### C1 — System Context

The System Context diagram illustrates how FlowForge fits into the enterprise ecosystem, the human actors that operate it, and external services it integrates with.

```mermaid
flowchart TB
    subgraph actors["Users & Personas"]
        direction LR
        admin(["Administrator<br/><i>[Platform Owner]</i>"]):::actor
        operator(["Operations Lead<br/><i>[SRE / DevOps Lead]</i>"]):::actor
        dev(["Workflow Developer<br/><i>[Data / Pipeline Engineer]</i>"]):::actor
        viewer(["Platform Observer<br/><i>[Auditor / Stakeholder]</i>"]):::actor
    end

    subgraph platformBoundary["FlowForge Platform Boundary"]
        flowforge["<b>FlowForge Distributed Orchestrator</b><br/><i>[Core Software System]</i><br/>• Kahn Topological Sort & 0-Cycle Invariant<br/>• Execution State Machine & SKIPPED Cascade<br/>• Parallel Branch Split & Join Convergence Engine<br/>• 5-Lane Asynchronous Task Queue Router<br/>• AI Prompt-to-DAG & Failure Self-Healing"]:::platform
    end

    subgraph externals["External Ecosystem & Infrastructure"]
        direction LR
        aiGateway["9Router AI Service<br/><i>[External LLM Gateway]</i><br/>DeepSeek / GPT-4o Prompt-to-DAG<br/>& Root-Cause Failure Analysis"]:::aiExternal
        workerNodes["Distributed Worker Cluster<br/><i>[External Compute Nodes]</i><br/>5 Isolated Task Queues<br/>Atomic Claiming & Heartbeat Sentinel"]:::workerExternal
        slackNotify["Notification Channels<br/><i>[External SaaS Webhook]</i><br/>Slack Webhook, PagerDuty, Email<br/>with Idempotency Key Guarantee"]:::notifyExternal
        dataStorage["Enterprise Data Lake / DW<br/><i>[External Storage]</i><br/>Parquet Lakehouse, Analytical DB,<br/>PostgreSQL Production Storage"]:::storageExternal
    end

    admin -- "Manages RBAC, users & audit trail [HTTPS]" --> flowforge
    operator -- "Triggers runs, cancels executions & monitors telemetry [HTTPS]" --> flowforge
    dev -- "Designs DAGs & invokes AI Prompt-to-DAG [HTTPS]" --> flowforge
    viewer -- "Observes real-time execution progress & workers [HTTPS]" --> flowforge

    flowforge -- "Sends natural prompts & receives DAG JSON [REST / HTTPS]" --> aiGateway
    flowforge -- "Dispatches tasks & receives status [Long-Poll / REST]" --> workerNodes
    flowforge -- "Sends incident alerts & report digests [Webhook POST]" --> slackNotify
    workerNodes -- "Ingests raw Parquet & upserts analytics data [SQL / I/O]" --> dataStorage

    classDef actor fill:#0f172a,color:#fff,stroke:#334155,stroke-width:2px;
    classDef platform fill:#1e40af,color:#fff,stroke:#3b82f6,stroke-width:3px;
    classDef aiExternal fill:#6b21a8,color:#fff,stroke:#a855f7,stroke-width:2px;
    classDef workerExternal fill:#0f766e,color:#fff,stroke:#14b8a6,stroke-width:2px;
    classDef notifyExternal fill:#c2410c,color:#fff,stroke:#f97316,stroke-width:2px;
    classDef storageExternal fill:#374151,color:#fff,stroke:#9ca3af,stroke-width:2px;

    style actors fill:#f8fafc,stroke:#cbd5e1,stroke-dasharray:4 4
    style platformBoundary fill:#eff6ff,stroke:#93c5fd,stroke-width:2px
    style externals fill:#f8fafc,stroke:#cbd5e1,stroke-dasharray:4 4
```

---

### C2 — Container

The Container diagram zooms into the FlowForge platform, illustrating high-level runtime and storage containers, protocols, and data flow.

```mermaid
flowchart TB
    subgraph users["Actors"]
        direction LR
        operator(["Operator / Admin / Developer"]):::actor
        viewer(["Platform Observer"]):::actor
    end

    subgraph dwop["FlowForge Platform Boundary [System]"]
        direction TB

        subgraph presentation["Presentation Layer"]
            web["Web Console<br/><i>[React 18 + Vite SPA]</i><br/>Tailwind CSS · Dark/Light Mode<br/>Kahn Stage Visualizer · Task Progress Tracker<br/>Visual Workflow Studio & Monaco JSON Editor"]:::webContainer
        end

        subgraph application["Application & Orchestration Layer"]
            backend["FastAPI Master Orchestrator<br/><i>[Python 3.11 ASGI Engine]</i><br/>REST API v1 · Bearer HMAC-SHA256 Auth<br/>Kahn DAG Engine · State Machine & SKIPPED Cascade<br/>5-Lane Queue Dispatcher · 9Router AI Copilot"]:::apiContainer
        end

        subgraph workerCluster["Distributed Execution Layer"]
            workers["Worker Daemon Fleet<br/><i>[Multi-Node Cluster / Python]</i><br/>worker-default · worker-compute<br/>worker-ai · worker-data · worker-payment<br/>Atomic Claiming · 45s Heartbeat Sentinel"]:::workerContainer
        end

        subgraph persistence["Data Storage Layer"]
            database[("Relational Database<br/><i>[SQLite Local / PostgreSQL Prod]</i><br/>app_users · workflow_definitions<br/>workflow_instances · task_executions<br/>worker_nodes · audit_logs")]:::dbContainer
        end
    end

    subgraph externalServices["External Cloud & Services"]
        llm["9Router AI Gateway<br/><i>[LLM API Engine]</i><br/>Prompt-to-DAG & Diagnostics"]:::aiExternal
        slack["Slack / Alert Gateway<br/><i>[HTTP Webhook API]</i><br/>P1 Escalation with Idempotency"]:::notifyExternal
        dataLake["Enterprise Analytics Storage<br/><i>[Data Warehouse / Lake]</i><br/>Parquet & Analytics Tables"]:::storageExternal
    end

    operator -- "Manages workflows, triggers runs, configures RBAC [HTTPS]" --> web
    viewer -- "Observes telemetry, timelines, and audit logs [HTTPS]" --> web
    web -- "REST API Calls / Bearer Token [JSON / HTTPS]" --> backend
    backend -- "Reads & Writes States, DAGs, Audits [SQL / ACID]" --> database
    backend -- "Inference & Failure Root Cause [REST / HTTPS]" --> llm
    backend -- "Task Dispatch & Heartbeat Poll [HTTP / Long-Poll]" --> workers
    workers -- "Dispatches P1 Alerts with Idempotency Key [Webhook]" --> slack
    workers -- "Persists analytics insights & transforms [TCP / I/O]" --> dataLake

    classDef actor fill:#0f172a,color:#fff,stroke:#334155,stroke-width:2px;
    classDef webContainer fill:#0284c7,color:#fff,stroke:#38bdf8,stroke-width:2px;
    classDef apiContainer fill:#1d4ed8,color:#fff,stroke:#60a5fa,stroke-width:3px;
    classDef workerContainer fill:#0f766e,color:#fff,stroke:#2dd4bf,stroke-width:2px;
    classDef dbContainer fill:#1e293b,color:#fff,stroke:#94a3b8,stroke-width:2px;
    classDef aiExternal fill:#6b21a8,color:#fff,stroke:#c084fc,stroke-width:2px;
    classDef notifyExternal fill:#c2410c,color:#fff,stroke:#fb923c,stroke-width:2px;
    classDef storageExternal fill:#374151,color:#fff,stroke:#9ca3af,stroke-width:2px;

    style dwop fill:#f0f9ff,stroke:#0284c7,stroke-width:2px
    style presentation fill:#e0f2fe,stroke:#7dd3fc,stroke-dasharray:3 3
    style application fill:#dbeafe,stroke:#93c5fd,stroke-dasharray:3 3
    style workerCluster fill:#ccfbf1,stroke:#5eead4,stroke-dasharray:3 3
    style persistence fill:#f1f5f9,stroke:#cbd5e1,stroke-dasharray:3 3
    style users fill:#ffffff,stroke:#e2e8f0,stroke-dasharray:4 4
    style externalServices fill:#faf5ff,stroke:#e9d5ff,stroke-dasharray:4 4
```

---

### C3 — Component

The Component diagram zooms into the **FastAPI Master Orchestrator Container**, displaying internal architectural tiers, services, and communication flows.

```mermaid
flowchart TB
    subgraph webLayer["Presentation Client"]
        web["React 18 Web Console"]:::webClient
    end

    subgraph master["FastAPI Master Orchestrator Container [Application Boundary]"]
        direction TB

        subgraph apiTier["1. API Routing & Gateway Tier [FastAPI Routers]"]
            direction LR
            authRoute["AuthRouter<br/><code>/api/v1/auth</code>"]:::apiBox
            wfRoute["WorkflowsRouter<br/><code>/api/v1/workflows</code>"]:::apiBox
            execRoute["ExecutionsRouter<br/><code>/api/v1/executions</code>"]:::apiBox
            workerRoute["WorkersRouter<br/><code>/api/v1/workers</code>"]:::apiBox
            taskRoute["TasksRouter<br/><code>/api/v1/tasks</code>"]:::apiBox
            aiRoute["AiRouter<br/><code>/api/v1/ai</code>"]:::apiBox
            auditRoute["AuditRouter<br/><code>/api/v1/audit</code>"]:::apiBox
        end

        subgraph securityTier["2. Security & Identity Guard [Core]"]
            direction LR
            tokenSvc["TokenService<br/><i>[HMAC-SHA256 Bearer]</i>"]:::secBox
            pwdSvc["PasswordService<br/><i>[PBKDF2 Hasher]</i>"]:::secBox
            rbacGuard["RoleGuard Dependency<br/><i>[ADMIN / OPERATOR / DEV / VIEWER]</i>"]:::secBox
        end

        subgraph domainTier["3. Domain Engine — Brain Tier [Domain]"]
            direction LR
            dagEngine["<b>DagEngine (Kahn Core)</b><br/>• 0-Cycle Detection Invariant<br/>• Topological Stage Layering (6 Layers)<br/>• Dependency Graph In-degree Resolver"]:::brainBox
            condEval["<b>ConditionEvaluator</b><br/>• Safe AST-Free Evaluator<br/>• Boolean & Comparison Logic<br/>• Dotted Context Path Traversal"]:::brainBox
        end

        subgraph serviceTier["4. Orchestration & Coordination Services [Services]"]
            direction LR
            execSvc["<b>ExecutionService</b><br/>• Instance State Machine<br/>• SKIPPED Cascade Transition<br/>• Parallel Join Resolution<br/>• Context Aggregator"]:::svcBox
            workerSvc["<b>WorkerService</b><br/>• 5-Lane Queue Router<br/>• Atomic Task Claiming<br/>• Concurrency Slot Limiter<br/>• Heartbeat Sentinel & Recovery"]:::svcBox
            aiSvc["<b>AiService</b><br/>• 9Router Prompt Decomposition<br/>• Task Schema Synthesizer<br/>• Root Cause Diagnostic Engine"]:::aiSvcBox
            wfSvc["<b>WorkflowService</b><br/>• Version Incrementor (v1, v2)<br/>• Schema Persistence Coordinator"]:::svcBox
        end

        subgraph persistTier["5. Unified Persistence Adapter [Persistence]"]
            store["<b>InMemoryStore & StoreAdapter</b><br/>Thread-safe Synchronized Storage · SQLite3 Local Adapter · PostgreSQL Connection Pool"]:::storeBox
        end
    end

    subgraph dataLayer["Persistence & External Services"]
        db[("SQLite / PostgreSQL Database")]:::dbBox
        workerCluster["Distributed Worker Cluster"]:::workerBox
        aiGateway["9Router AI Gateway (LLM API)"]:::aiBox
    end

    web --> apiTier
    apiTier --> securityTier
    apiTier --> serviceTier

    wfRoute --> wfSvc
    wfSvc --> dagEngine
    wfSvc --> store

    execRoute --> execSvc
    execSvc --> dagEngine
    execSvc --> condEval
    execSvc --> store

    workerRoute --> workerSvc
    taskRoute --> workerSvc
    workerSvc --> execSvc
    workerSvc --> store

    aiRoute --> aiSvc
    aiSvc --> aiGateway
    aiSvc --> dagEngine

    securityTier --> store
    auditRoute --> store
    store --> db
    workerSvc <--> workerCluster

    classDef webClient fill:#0284c7,color:#fff,stroke:#0369a1,stroke-width:2px;
    classDef apiBox fill:#3b82f6,color:#fff,stroke:#1d4ed8,stroke-width:1px;
    classDef secBox fill:#0369a1,color:#fff,stroke:#0284c7,stroke-width:1px;
    classDef brainBox fill:#1e3a8a,color:#fff,stroke:#60a5fa,stroke-width:2px;
    classDef svcBox fill:#0f766e,color:#fff,stroke:#14b8a6,stroke-width:2px;
    classDef aiSvcBox fill:#6b21a8,color:#fff,stroke:#a855f7,stroke-width:2px;
    classDef storeBox fill:#1e293b,color:#fff,stroke:#475569,stroke-width:2px;
    classDef dbBox fill:#0f172a,color:#fff,stroke:#64748b,stroke-width:2px;
    classDef workerBox fill:#047857,color:#fff,stroke:#10b981,stroke-width:2px;
    classDef aiBox fill:#581c87,color:#fff,stroke:#9333ea,stroke-width:2px;

    style master fill:#f8fafc,stroke:#2563eb,stroke-width:3px
    style apiTier fill:#eff6ff,stroke:#bfdbfe,stroke-dasharray:3 3
    style securityTier fill:#e0f2fe,stroke:#bae6fd,stroke-dasharray:3 3
    style domainTier fill:#dbeafe,stroke:#93c5fd,stroke-width:2px
    style serviceTier fill:#f0fdfa,stroke:#99f6e4,stroke-dasharray:3 3
    style persistTier fill:#f1f5f9,stroke:#cbd5e1,stroke-width:1px
```

Complete architectural documentation: [C4 Architecture Handbook](docs/architecture/c4/README.md) and [arc42 Engineering Handbook](docs/architecture/arc42/README.md).

---

## 4. Database Diagrams and OpenAPI 3.1 Contract

FlowForge standardizes persistence schemas and the HTTP API contract to guarantee complete cross-system traceability.

### 4.1 Database diagrams

The database model keeps users, workflow definitions, execution instances, task steps, distributed workers, and audit events normalized and relational.

```mermaid
erDiagram
    app_users ||--o{ workflow_definitions : creates
    app_users ||--o{ audit_logs : performs
    workflow_definitions ||--o{ workflow_instances : instantiates
    workflow_instances ||--o{ task_executions : contains
    worker_nodes ||--o{ task_executions : executes

    app_users {
        int id PK
        string username
        string email UK
        string password_hash
        string full_name
        string role
        boolean is_active
        datetime created_at
        datetime updated_at
    }
    workflow_definitions {
        int id PK
        string name UK
        int version
        string description
        text dag_definition
        boolean is_active
        int created_by FK
        datetime created_at
        datetime updated_at
    }
    workflow_instances {
        int id PK
        int workflow_id FK
        string workflow_name
        int version
        string status
        text input_payload
        text output_payload
        text context_data
        string error_message
        int triggered_by FK
        datetime started_at
        datetime completed_at
    }
    task_executions {
        int id PK
        int instance_id FK
        string step_id
        string step_name
        string task_type
        string queue_name
        string status
        int retry_count
        int max_retries
        int timeout_seconds
        string condition
        text input_payload
        text output_payload
        string error_message
        string assigned_worker_id FK
        datetime scheduled_at
        datetime claimed_at
        datetime started_at
        datetime completed_at
    }
    worker_nodes {
        string worker_id PK
        string hostname
        string status
        text supported_queues
        int max_concurrency
        int current_load
        int completed_tasks
        datetime last_heartbeat_at
        datetime registered_at
    }
    audit_logs {
        int id PK
        int actor_user_id FK
        string action
        string module
        string detail
        datetime created_at
    }
```

See the [detailed database diagram](docs/DATABASE.md), [data model](docs/05-data-model.md), and [schema DDL](src/database/workflow_orchestrator.sql).

### 4.2 OpenAPI 3.1 API documentation

The HTTP contract is defined in OpenAPI 3.1 and organized into Authentication, Workflows, Executions, Tasks, Workers, AI Engine, and Audit.

```text
16 paths
24 operations
Bearer HMAC-SHA256 token security
Role metadata (ADMIN, OPERATOR, DEVELOPER, VIEWER)
Pydantic Request and Response schemas
RFC 7807-compatible application/problem+json error responses
Swagger UI interactive documentation at /docs
```

Every operation has a stable route, documented parameters, Pydantic request/response models, success/error status codes, and RBAC authorization rules.

- [API documentation and sample calls](docs/api/README.md)
- Interactive Swagger UI: `http://127.0.0.1:8000/docs`

---

## 5. Frontend and Backend Folder Structures

### 5.1 Current repository layout

```text
FlowForge/
├── src/
│   ├── frontend/                     # React 18 + Vite SPA Console
│   │   ├── src/
│   │   │   ├── components/           # Shell, Topbar, BrandLogo
│   │   │   ├── features/             # Feature-driven modules (auth, dashboard, workflows, executions, workers, audit, users, profile)
│   │   │   ├── lib/                  # API client, store, auth, format, icons, theme
│   │   │   ├── App.jsx               # Routes and navigation guards
│   │   │   └── index.css             # High-tech design system (Dark & Light theme)
│   │   ├── public/                   # Static assets
│   │   └── package.json              # Frontend dependencies and 27 Vitest tests
│   ├── backend/                      # Python FastAPI Async Backend
│   │   ├── app/
│   │   │   ├── api/routes/           # Endpoints: auth, workflows, executions, tasks, workers, ai, audit, users
│   │   │   ├── core/                 # Dependencies, exceptions, security, token service
│   │   │   ├── domain/               # Kahn's DAG engine, models, condition evaluator
│   │   │   ├── persistence/          # Store adapter, SQLite / PostgreSQL connection
│   │   │   ├── services/             # Workflow, execution, worker, and AI services
│   │   │   └── worker_agent.py       # Distributed Multi-Worker Cluster Daemon
│   │   ├── tests/                    # 31 Pytest automated test cases (100% Passed)
│   │   ├── pyproject.toml            # Pytest configuration
│   │   └── requirements.txt          # Python dependencies
│   └── database/
│       ├── workflow_orchestrator.db  # SQLite local database
│       ├── workflow_orchestrator.sql # PostgreSQL target schema
│       └── init_db.py                # Schema initialization script
├── docs/                             # Architectural and engineering specifications
│   ├── api/                          # OpenAPI 3.1 contract and usage guide
│   ├── architecture/                 # C4, arc42, class diagrams, sequence diagrams
│   ├── requirements/                 # Business rules and non-functional requirements
│   ├── traceability/                 # Cross-step master traceability matrix
│   ├── images/                       # UI screenshots and visual references
│   └── 01-scope.md … 09-step-7-readiness.md
├── run.sh                            # Unified CLI launcher (backend, frontend, test, worker, db)
├── .env                              # Active local environment variables
├── .env.example                      # Documented environment template
└── README.md
```

### 5.2 Target React feature structure

```text
src/frontend/src/
├── components/          # Shared layout, BrandLogo, Topbar, Shell
├── features/
│   ├── auth/            # hooks/useAuth.js, pages/Login.jsx, services/authService.js
│   ├── dashboard/       # hooks/useDashboard.js, pages/Dashboard.jsx, services/dashboardService.js
│   ├── workflows/       # hooks/useWorkflows.js, pages/WorkflowDefinitionsPage.jsx, components/WorkflowStudio.jsx
│   ├── executions/      # hooks/useExecutions.js, pages/ExecutionsPage.jsx, services/executionService.js
│   ├── workers/         # hooks/useWorkers.js, pages/WorkersPage.jsx, services/workerService.js
│   ├── audit/           # hooks/useAuditLogs.js, pages/AuditPage.jsx, services/auditService.js
│   ├── users/           # hooks/useUsers.js, pages/UsersPage.jsx, services/userService.js
│   └── profile/         # pages/ProfilePage.jsx (Self-service profile and RBAC matrix)
├── services/            # Base apiClient and HTTP utilities
├── lib/                 # Store, auth context, date/number formatting, icons, theme
└── test/                # Setup and Vitest unit/integration tests (27 tests pass)
```

Target dependency flow:
```text
Page/Component → Feature Hook → Feature Service → apiClient → FastAPI REST API
```

### 5.3 Target FastAPI backend structure

```text
src/backend/app/
├── api/
│   ├── router.py                     # Aggregated API router (/api/v1)
│   └── routes/                       # Modular endpoints (auth, workflows, executions, tasks, workers, ai, audit, users)
├── core/
│   ├── dependencies.py               # RBAC role guards and Bearer token extraction
│   ├── exceptions.py                 # RFC 7807 problem details error mapping
│   └── security.py                   # PBKDF2 password hasher & HMAC-SHA256 token service
├── domain/
│   ├── dag_engine.py                 # Kahn's algorithm, cycle validation, step readiness, condition evaluation
│   └── models.py                     # Pydantic domain models & request/response contracts
├── persistence/
│   ├── database.py                   # Database engine, connection pooling
│   └── store.py                      # Thread-safe in-memory & relational store adapter
├── services/
│   ├── ai_service.py                 # Prompt-to-DAG & failure diagnostics (Self-Healing)
│   ├── execution_service.py          # State machine, step advancement, conditional cascade, cancel
│   ├── worker_service.py             # Heartbeat monitor, queue polling, atomic task claimer
│   └── workflow_service.py           # DAG CRUD & persistence
└── worker_agent.py                   # Multi-worker daemon cluster (5 queue pools)
```

---

## 6. Detailed Class and Sequence Design

Detailed design derives from the C4 components in Step 3, the database and OpenAPI contracts in Step 4, and the folder ownership in Step 5.

### 6.1 C4 Level 4 — Code collaboration

#### L4.1 Workflow Execution & Task Lifecycle Management

```mermaid
flowchart TB
    subgraph executionEngine["Execution Management Engine [Component]"]
        direction TB
        handler["ExecutionsRouter<br/><i>[FastAPI Router]</i><br/>Parses trigger requests, extracts JWT,<br/>and serializes JSON responses"]
        service["ExecutionService<br/><i>[Python Service]</i><br/>Coordinates instance creation, step dispatch,<br/>and cascade SKIPPED advancement"]
        engine["DagEngine<br/><i>[Python Domain Class]</i><br/>Executes Kahn's algorithm, 0-cycle check,<br/>and safe expression evaluation"]
        queue["WorkerService<br/><i>[Python Service]</i><br/>Enforces atomic claiming and dispatches<br/>tasks across 5 isolated queues"]
        store["StoreAdapter<br/><i>[Persistence Layer]</i><br/>Synchronizes in-memory cache and SQLite/PostgreSQL"]

        handler --> service
        service --> engine
        service --> queue
        service --> store
    end

    web["Web Console<br/><i>[React 18 SPA]</i>"]
    worker["Worker Node<br/><i>[Worker Daemon]</i>"]
    db[("Database<br/><i>[SQLite / PostgreSQL]</i>")]

    web --> handler
    queue <--> worker
    store --> db

    classDef comp fill:#1168bd,color:#fff,stroke:#0b4f9e,stroke-width:2px;
    classDef ext fill:#0f172a,color:#fff,stroke:#334155,stroke-width:2px;
    class handler,service,engine,queue,store comp
    class web,worker,db ext
    style executionEngine fill:#f8fbff,stroke:#1168bd,stroke-dasharray:4 4
```

#### L4.2 AI Failure Diagnostics & Self-Healing

```mermaid
flowchart TB
    subgraph aiEngine["AI Intelligence Engine [Component]"]
        direction TB
        aiRouter["AiRouter<br/><i>[FastAPI Router]</i><br/>Receives diagnosis requests and parameters"]
        aiService["AiService<br/><i>[Python Service]</i><br/>Inspects execution traces, error logs,<br/>and queries 9Router LLM heuristics"]
        diagModel["AiDiagnoseFailureResponse<br/><i>[Domain Model]</i><br/>Root cause, severity, and suggested fix"]

        aiRouter --> aiService
        aiService --> diagModel
    end

    web["Web Console<br/><i>[React 18 SPA]</i>"]
    execService["ExecutionService<br/><i>[State Machine Service]</i>"]
    llm["9Router AI Gateway<br/><i>[DeepSeek / OpenAI]</i>"]

    web --> aiRouter
    aiService --> execService
    aiService --> llm

    classDef aiComp fill:#7c3aed,color:#fff,stroke:#6d28d9,stroke-width:2px;
    classDef extBox fill:#0f172a,color:#fff,stroke:#334155,stroke-width:2px;
    class aiRouter,aiService,diagModel aiComp
    class web,execService,llm extBox
    style aiEngine fill:#faf5ff,stroke:#7c3aed,stroke-dasharray:4 4
```

---

### 6.2 Core class diagrams

#### 1. Authentication & Identity

```mermaid
classDiagram
    direction TB

    class AuthRouter {
        +login(LoginRequest) LoginResult
        +logout(UserAccount) Response
        +get_current_user() SafeUser
    }

    class LoginRequest {
        +string email
        +string password
    }

    class LoginResult {
        +string accessToken
        +string tokenType
        +datetime expiresAt
        +SafeUser user
    }

    class SafeUser {
        +int id
        +string username
        +string email
        +string fullName
        +UserRole role
        +bool isActive
        +datetime lastLoginAt
    }

    class TokenService {
        +issue(int user_id, string role) string
        +validate(string token) dict
    }

    class PasswordService {
        +hash_password(string password) string
        +verify_password(string stored, string password) bool
    }

    class InMemoryStore {
        +find_user_by_email(string email) UserAccount
        +get_user_by_id(int id) UserAccount
        +record_audit(string action, string module, string detail, int user_id)
    }

    AuthRouter --> LoginRequest
    AuthRouter --> LoginResult
    AuthRouter --> TokenService
    AuthRouter --> PasswordService
    AuthRouter --> InMemoryStore
    LoginResult --> SafeUser
```

#### 2. Workflow & DAG Engine

```mermaid
classDiagram
    direction TB

    class DagEngine {
        +validate_dag(DagDefinition dag) void
        +compute_execution_layers(DagDefinition dag) list
        +get_ready_steps(DagDefinition dag, set completed, set running) list
        +evaluate_condition(string condition, dict context) bool
    }

    class DagDefinition {
        +list steps
    }

    class DagStep {
        +string id
        +string name
        +TaskType type
        +string queue
        +list dependsOn
        +int maxRetries
        +int timeoutSeconds
        +string condition
        +string configurationJson
    }

    class WorkflowService {
        +list_workflows() list
        +get_workflow_by_id(int id) WorkflowDefinition
        +create_workflow(CreateWorkflowRequest req, int user_id) WorkflowDefinition
    }

    class WorkflowDefinition {
        +int id
        +string name
        +int version
        +string description
        +DagDefinition dag
        +bool isActive
        +int createdBy
    }

    WorkflowService --> DagEngine
    WorkflowService --> WorkflowDefinition
    WorkflowDefinition --> DagDefinition
    DagDefinition --> DagStep
```

#### 3. Execution Lifecycle & Worker Dispatch

```mermaid
classDiagram
    direction TB

    class ExecutionService {
        +trigger_workflow(int workflow_id, TriggerWorkflowRequest req, UserAccount user) WorkflowInstance
        +complete_task(int task_id, CompleteTaskRequest req) TaskExecution
        +fail_task(int task_id, FailTaskRequest req) TaskExecution
        +cancel_execution(int instance_id, UserAccount user) WorkflowInstance
    }

    class WorkerService {
        +register_worker(RegisterWorkerRequest req) WorkerNode
        +heartbeat(string worker_id) WorkerNode
        +poll_tasks(string worker_id, list queues) TaskExecution
    }

    class WorkflowInstance {
        +int id
        +int workflowId
        +string workflowName
        +WorkflowStatus status
        +string inputPayloadJson
        +string outputPayloadJson
        +datetime startedAt
        +datetime completedAt
    }

    class TaskExecution {
        +int id
        +int instanceId
        +string stepId
        +string stepName
        +TaskType taskType
        +string queueName
        +StepStatus status
        +int retryCount
        +int maxRetries
        +int timeoutSeconds
        +string condition
        +int attempt
        +list releasedSteps
        +string assignedWorkerId
    }

    ExecutionService --> WorkflowInstance
    WorkflowInstance --> TaskExecution
    WorkerService --> TaskExecution
```

Source: [Core Class Diagrams](docs/architecture/uml/01-class-diagrams.md)

---

### 6.3 Sequence diagrams

The runtime sequence illustrates parallel branch execution, conditional step evaluation, atomic claiming, and join resolution:

```mermaid
sequenceDiagram
    autonumber
    actor Dev as Workflow Developer
    participant UI as React Console
    participant API as FastAPI Orchestrator
    participant DAG as DagEngine (Kahn's)
    participant Store as StoreAdapter / DB
    participant Worker as Distributed Worker Fleet

    Dev->>UI: Click "Trigger Run" with input payload
    UI->>API: POST /api/v1/executions/workflows/{id}/trigger
    API->>Store: Create WorkflowInstance (Status: RUNNING)
    API->>DAG: get_ready_steps(dag, completed=[])
    DAG-->>API: Returns [step-fetch-reviews] (Root Step)
    API->>Store: Create TaskExecution (SCHEDULED, queue="default")
    API-->>UI: 201 Created (Instance details & step progress)

    Worker->>API: POST /api/v1/tasks/poll (queues=["default"])
    API->>Store: Claim task atomically (Status: RUNNING)
    API-->>Worker: Return task payload

    Worker->>Worker: Ingest customer reviews
    Worker->>API: POST /api/v1/tasks/{id}/complete (COMPLETED)
    API->>DAG: Advance DAG -> Releases [step-ai-sentiment]

    Note over API,Worker: After AI Sentiment completes, 2 parallel branches unlock!
    API->>Store: Schedule [step-ai-summary] (ai-agent) & [step-detect-urgent] (ai-agent)

    Worker->>API: Complete [step-detect-urgent] (hasUrgentReviews=True)
    API->>DAG: evaluate_condition("hasUrgentReviews == true") -> True
    API->>Store: Schedule [step-alert-escalate] (queue="default", attempt=1)

    Worker->>Worker: Dispatch Slack alert with Idempotency-Key
    Worker->>API: Complete [step-alert-escalate] (Status: SENT)

    Note over API,Store: Downstream Join step unlocks once both Summary & Slack Alert finish!
    API->>Store: Schedule [step-persist-insights] with merged context
    API->>UI: Real-time telemetry update (All 7 Steps COMPLETED)
```

- [Core sequence diagrams](docs/architecture/uml/02-sequence-diagrams.md)
- [API runtime sequences and operation traceability](docs/architecture/uml/03-api-traceability.md)

---

## Quick Start & Runbook

FlowForge provides a unified CLI runner script `./run.sh` to manage the backend orchestrator, frontend developer console, distributed worker agent, automated test suites, and database seeding.

### 1. Launch FastAPI Backend (Terminal 1)
```bash
./run.sh backend
# Orchestrator API listening at http://127.0.0.1:8000
# Interactive OpenAPI Swagger UI at http://127.0.0.1:8000/docs
```

### 2. Launch React Developer Console (Terminal 2)
```bash
./run.sh frontend
# Vite Dev Server listening at http://localhost:5173
```

### 3. Launch Distributed Worker Daemon (Terminal 3)
```bash
./run.sh worker
# Connects to Orchestrator and continuously claims tasks across 5 isolated queues:
# [default, compute, data-io, payment, ai-agent]
```

### 4. Run Automated Test Suites
```bash
# Run 31 Backend Pytest suites (Kahn DAG engine, state machine, worker queues, AI service, branching)
./run.sh test

# Run 27 Frontend Vitest suites (React UI, API client, custom hooks, Visual Studio)
cd src/frontend && npm test
```

### 5. Pre-configured Demo Accounts
| Role | Email | Password | Capabilities |
|---|---|---|---|
| **Administrator** | `admin@orchestrator.local` | `ChangeMe123!` | Full cluster governance, user directory, immutable security audit trail |
| **Operations Lead** | `operator@orchestrator.local` | `ChangeMe123!` | Trigger workflows, cancel executions, manage worker nodes, inspect telemetry |
| **Workflow Developer** | `dev@orchestrator.local` | `ChangeMe123!` | Design DAG definitions, Visual Studio drag-and-drop, AI Prompt-to-DAG Copilot |
| **Platform Observer** | `viewer@orchestrator.local` | `ChangeMe123!` | Read-only dashboard, executions monitoring, worker queue metrics |

---

## Documentation

- Requirements: [Scope](docs/01-scope.md), [Features](docs/02-features.md), [INVEST backlog](docs/08-invest-requirements.md), [Acceptance criteria](docs/06-acceptance-criteria.md).
- Requirements catalogs: [Business rules](docs/requirements/business-rules.md) and [Non-functional requirements](docs/requirements/non-functional-requirements.md).
- UI/UX: [Information architecture & Relume Sitemap](docs/04-information-architecture.md).
- Database: [Data model](docs/05-data-model.md), [ER diagram](docs/DATABASE.md), [PostgreSQL schema](src/database/workflow_orchestrator.sql).
- Folder structure: [React and FastAPI backend](docs/07-folder-structure.md).
- Code-level design: [Core class diagrams](docs/architecture/uml/01-class-diagrams.md), [core sequences](docs/architecture/uml/02-sequence-diagrams.md), and [API traceability/sequences](docs/architecture/uml/03-api-traceability.md).
- API contract: [API documentation](docs/api/README.md) and Swagger UI at `http://127.0.0.1:8000/docs`.

---

## Project Progress

- [x] Define scope, goals, and user roles
- [x] Write the feature list and use cases
- [x] Write user stories following INVEST
- [x] Write acceptance criteria and business rules
- [x] Write non-functional requirements
- [x] Design the information architecture and screen permissions
- [x] Design the screen hierarchy, task flows, and UI states
- [x] Build the React UI prototype for each role
- [x] Design the C4 System Context (C1)
- [x] Design the C4 Container (C2)
- [x] Design the C4 Component (C3) and arc42 documentation
- [x] Design the SQLite / PostgreSQL schema, DBML, and data relationships
- [x] Write the API documentation in OpenAPI 3.1
- [x] Design the React frontend folder structure
- [x] Design the FastAPI backend folder structure
- [x] Design class diagrams and sequence diagrams
- [x] Create traceability between requirements, screens, API, and database
- [x] Build the FastAPI async backend engine
- [x] Build the authentication, user management, and personal profile API
- [x] Implement the Kahn algorithm DAG cycle detection, validation, and stage partitioning
- [x] Implement the workflow execution state machine and step advancement
- [x] Implement conditional branching (`condition`) and automatic `SKIPPED` cascade resolution
- [x] Implement parallel branch fork & join convergence with context aggregation
- [x] Implement distributed worker queue dispatching across 5 isolated queues
- [x] Implement atomic task claiming, concurrency slots, and stale worker recovery
- [x] Implement the 9Router AI Prompt-to-DAG generator and failure self-healing diagnostics
- [x] Write unit tests and API integration tests (**31/31 Pytest tests passed**)
- [x] Connect the React frontend to the API (login, workflows, studio, executions, workers, users, profile, audit)
- [x] Add high-tech developer console design system with Dark / Light theme toggle
- [x] Record immutable audit events across 7 operational actions (LOGIN, CREATE, TRIGGER, CANCEL, SKIP, RETRY, FAIL)
- [x] Add frontend tests with Vitest (**27/27 tests passed**)
- [ ] Connect production-grade Kafka / RabbitMQ broker adapter for ultra-high throughput worker clusters
- [ ] Deploy multi-region Kubernetes cluster with Horizontal Pod Autoscaler (HPA) for compute workers
