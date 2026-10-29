# Distributed Workflow Orchestration Platform (DWOP)

Distributed Workflow Orchestration Platform (DWOP) helps engineering and operations teams orchestrate complex, multi-step distributed workflows as Directed Acyclic Graphs (DAG), manage asynchronous task dispatch across isolated worker queues, automate failure self-healing with AI, and track end-to-end execution lifecycle and audit logs in one unified console.

## 1. Requirements — INVEST, Use Cases, and Acceptance Criteria

Requirements define what Distributed Workflow Orchestration Platform must do, who uses it, the value delivered, and the observable conditions of success. User stories are reviewed with INVEST and mapped to use cases and acceptance criteria.

### 1.1 Product mind map

![DWOP mind map](docs/images/admin/mindmap.png)

### 1.2 INVEST requirements

The V1 backlog includes 13 user stories. These stories cover authentication, cluster dashboard, workflow DAG definition, AI prompt-to-DAG generation, execution triggering, real-time step progress tracking, execution cancellation, AI failure diagnosis and self-healing, worker queue monitoring, audit logs, user RBAC, and personal profile management.
Before a user story is ready for development, it is checked using the INVEST criteria.

| Criterion | Meaning in Distributed Workflow Orchestration Platform |
|---|---|
| **Independent** | Each story should provide a clear feature and depend on other stories only when necessary (e.g. DAG cycle validation is independent of worker polling). |
| **Negotiable** | The UI layout and implementation details can change as long as the core orchestration guarantees and permission rules stay the same. |
| **Valuable** | Each story should provide value to the operator, developer, or platform reliability. |
| **Estimable** | Roles, inputs, outputs, queue routing, retry policies, and failure outcomes are documented. |
| **Small** | Each story covers one primary capability and can be divided into API, domain engine, worker dispatcher, UI, and test tasks. |
| **Testable** | Every story maps to observable acceptance criteria and expected authorization, cycle validation, state machine transition, and error behavior. |

```text
US01–US02   Authentication and session
US03        Cluster telemetry and dashboard
US04–US05   Workflow DAG definitions and AI Prompt-to-DAG
US06–US08   Execution triggering, step progress, and cancellation
US09        AI failure diagnostics and self-healing recommendations
US10        Distributed worker cluster and queue monitoring
US11        Audit trail and compliance logging
US12        User management and RBAC policy
US13        Personal profile and credentials
```

All V1 stories have estimable target behavior. DAG cycle validation is deterministic via Kahn's algorithm, task dispatching is isolated across 5 queues, and execution state machine transitions are atomic. The complete story-level review is maintained in [INVEST Requirements](docs/08-invest-requirements.md).

### 1.3 Use cases

```mermaid
flowchart TB
    subgraph roles["Actors"]
        direction LR
        admin(["Administrator"])
        operator(["Operations Lead"])
        dev(["Workflow Developer"])
        viewer(["Platform Observer"])
    end

    subgraph system["Distributed Workflow Orchestration Platform — System Boundary"]
        direction LR
        adminCases["<b>Administrator</b><br/><br/>UC01 Login · Logout<br/>UC02 View Dashboard · Manage Profile<br/>UC03 Define DAG · UC04 AI Prompt-to-DAG<br/>UC05 Trigger Execution · UC06 Cancel Run<br/>UC07 Track Step Lifecycle<br/>UC08 AI Diagnose Failure (Self-Healing)<br/>UC09 Monitor Workers & Queues<br/>UC10 View Audit Log<br/>UC11 Manage Users & RBAC"]
        operatorCases["<b>Operations Lead</b><br/><br/>UC01 Login · Logout<br/>UC02 View Dashboard · Manage Profile<br/>UC03 Define DAG<br/>UC05 Trigger Execution · UC06 Cancel Run<br/>UC07 Track Step Lifecycle<br/>UC08 AI Diagnose Failure (Self-Healing)<br/>UC09 Monitor Workers & Queues<br/>UC10 View Audit Log"]
        devCases["<b>Workflow Developer</b><br/><br/>UC01 Login · Logout<br/>UC02 View Dashboard · Manage Profile<br/>UC03 Define DAG · UC04 AI Prompt-to-DAG<br/>UC05 Trigger Execution<br/>UC07 Track Step Lifecycle<br/>UC08 AI Diagnose Failure (Self-Healing)<br/>UC09 Monitor Workers & Queues"]
        viewerCases["<b>Platform Observer</b><br/><br/>UC01 Login · Logout<br/>UC02 View Dashboard · Manage Profile<br/>UC07 Track Step Lifecycle<br/>UC09 Monitor Workers & Queues"]
    end

    admin --> adminCases
    operator --> operatorCases
    dev --> devCases
    viewer --> viewerCases

    classDef actor fill:#666,color:#fff,stroke:#333
    classDef primary fill:#1168bd,color:#fff,stroke:#0b4f9e
    classDef standard fill:#3a7bd5,color:#fff,stroke:#245fa8
    class admin,operator,dev,viewer actor
    class adminCases,operatorCases primary
    class devCases,viewerCases standard
    style roles fill:#fff,stroke:#bbb,stroke-dasharray:5 5
    style system fill:#f8fbff,stroke:#1168bd,stroke-dasharray:5 5
```

For detailed actors, permissions, and business flows, see [Actors, roles, and use cases](docs/03-use-cases.md).

### 1.4 Roles and permissions

| Capability | Admin | Operations Lead | Developer | Viewer |
|---|---|---|---|---|
| View dashboard & telemetry | Yes | Yes | Yes | Yes |
| Define & edit DAG workflows | Yes | Yes | Yes | No |
| AI Prompt-to-DAG generator | Yes | No | Yes | No |
| Trigger workflow runs | Yes | Yes | Yes | No |
| Cancel executions | Yes | Yes | No | No |
| AI failure diagnostics | Yes | Yes | Yes | No |
| View worker nodes & queues | Yes | Yes | Yes | Yes |
| Activity audit trail | Yes | Yes | No | No |
| User management & RBAC | Yes | No | No | No |

The backend enforces RBAC on every API endpoint; hiding frontend controls serves UI/UX only.

---

## 2. Information Architecture, Screen Hierarchy, and UI/UX

The information architecture organizes the authenticated workspace by orchestration capability. Screen permissions and navigation follow the role matrix, while loading, empty, validation, error, saving, and success states are defined consistently.

### 2.1 Information architecture

#### Relume Sitemap
![Relume Sitemap](docs/images/admin/sitemap.png)

```text
Public
└── Login

Authenticated (Shell Layout)
├── Dashboard (Telemetry, KPIs, Quick Trigger)
├── Workflows (DAG Definitions, Visual Mini-Pipeline, AI Prompt-to-DAG)
├── Executions (Runs Timeline, Step Progress, AI Self-Healing)
├── Workers (Worker Nodes, Concurrency Slots, 5 Task Queues)
├── Audit (Immutable Security Audit Trail)
├── Users (RBAC Matrix, Account Directory)
├── Profile (Credentials, Permissions Matrix)
└── Forbidden (403 Access Denied)
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

This README presents only C1–C3. C4 Level 4 and detailed UML are maintained in the architecture documentation directory.

### C1 — System Context

```mermaid
flowchart LR
    admin(["Administrator"])
    operator(["Operations Lead"])
    dev(["Workflow Developer"])
    viewer(["Platform Observer"])

    subgraph boundary[" "]
        dwop["Distributed Workflow Orchestration Platform<br/><i>[Software System]</i><br/>Manages DAG validation, task dispatching,<br/>worker queues, AI diagnostics, and audit logs"]
    end

    admin -- "manages users, cluster config, and audit trail" --> dwop
    operator -- "triggers workflows, cancels runs, and diagnoses failures" --> dwop
    dev -- "designs DAGs and generates pipelines via AI" --> dwop
    viewer -- "observes dashboard, telemetry, and runs" --> dwop

    style dwop fill:#1168bd,color:#fff
```

### C2 — Container

```mermaid
flowchart TB
    operator(["Administrator / Operator / Developer"])
    reader(["Platform Observer"])
    workers(["Distributed Worker Nodes<br/><i>[Compute Instances]</i>"])

    subgraph platform["Distributed Workflow Orchestration Platform [Boundary]"]
        direction TB
        subgraph presentation["Presentation"]
            web["Web Console<br/><i>[Container: React 18 + Vite SPA]</i><br/>Interactive DAG visualizer, executions timeline,<br/>telemetry dashboard, and dark/light mode"]
        end
        subgraph application["Application"]
            backend["FastAPI Orchestrator Master<br/><i>[Container: Python FastAPI ASGI]</i><br/>Authentication, DAG validation (Kahn),<br/>state machine, queue dispatch, and AI copilot"]
        end
        subgraph data["Data"]
            database[("Database<br/><i>[Container: SQLite / PostgreSQL]</i><br/>Users, workflow definitions, instances,<br/>task executions, workers, and audit logs")]
        end
    end

    llm[("AI Engine / LLM Service<br/><i>[External Service]</i><br/>Prompt-to-DAG & root cause diagnostics")]

    operator --> web
    reader --> web
    web -- "REST / HTTPS / JSON" --> backend
    backend -- "Queue Polling & Heartbeat" --> workers
    backend -- "Inference & Diagnostics" --> llm
    backend -- "SQL / Relational Protocol" --> database

    style web fill:#1168bd,color:#fff
    style backend fill:#1168bd,color:#fff
    style database fill:#1168bd,color:#fff
```

### C3 — Component

```mermaid
flowchart TB
    subgraph rt["FastAPI Master Orchestrator [Container]"]
        direction TB
        api["HTTP API & Routers<br/><i>[Component: FastAPI]</i><br/>REST endpoints, request parsing,<br/>and RFC 7807 problem details"]
        identity["Identity & Access<br/><i>[Component]</i><br/>Login, HMAC-SHA256 tokens, RBAC,<br/>and password hashing (PBKDF2)"]
        dagEngine["DAG Engine<br/><i>[Component: Domain]</i><br/>Topological sort, Kahn cycle detection,<br/>and dependency resolution"]
        executionMgr["Execution State Machine<br/><i>[Component: Service]</i><br/>Instance transitions, task lifecycle,<br/>step advancement, and retry policy"]
        queueDispatcher["Queue Dispatcher<br/><i>[Component: Service]</i><br/>Worker polling, priority routing,<br/>and heartbeat monitoring"]
        aiService["AI Copilot Service<br/><i>[Component: Service]</i><br/>Prompt-to-DAG generation & failure diagnostics"]
        auditLog["Audit Trail<br/><i>[Component]</i><br/>Immutable action logging for compliance"]
        persistence["Persistence Layer<br/><i>[Component]</i><br/>In-memory, SQLite & PostgreSQL repositories"]
    end

    web["Web Console<br/><i>[Container: React.js]</i>"]
    db[("Database<br/><i>[Container: SQLite / PostgreSQL]</i>")]
    workerNodes["Distributed Workers<br/><i>[External Cluster]</i>"]

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
    identity --> persistence
    auditLog --> persistence
    persistence --> db

    style api fill:#1168bd,color:#fff
    style identity fill:#1168bd,color:#fff
    style dagEngine fill:#0b4f9e,color:#fff
    style executionMgr fill:#0b4f9e,color:#fff
    style queueDispatcher fill:#1168bd,color:#fff
    style aiService fill:#8b5cf6,color:#fff
    style auditLog fill:#1168bd,color:#fff
    style persistence fill:#1168bd,color:#fff
```

Complete documentation: [C4 Architecture](docs/architecture/c4/README.md) and [arc42 Architecture Handbook](docs/architecture/arc42/README.md).

---

## 4. Database Diagrams and OpenAPI 3.0 Contract

Step 4 defines the persistence contract and the HTTP contract connecting the React console to the backend.

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
    }
    workflow_definitions {
        int id PK
        string name UK
        int version
        string description
        json dag_schema
        boolean is_active
        int created_by FK
        datetime created_at
    }
    workflow_instances {
        int id PK
        int workflow_id FK
        string workflow_name
        int version
        string status
        json input_payload
        json context_data
        datetime started_at
        datetime completed_at
    }
    task_executions {
        int id PK
        int instance_id FK
        string step_id
        string step_name
        string status
        string queue_name
        string assigned_worker_id FK
        int retry_count
        int max_retries
        int timeout_seconds
    }
    worker_nodes {
        string worker_id PK
        string hostname
        string status
        json supported_queues
        int max_concurrency
        int current_load
        datetime last_heartbeat_at
    }
    audit_logs {
        int id PK
        string action
        string module
        string detail
        int actor_user_id FK
        datetime changed_at
    }
```

See the [detailed database diagram](docs/DATABASE.md), [data model](docs/05-data-model.md), and [schema DDL](src/database/workflow_orchestrator.sql).

### 4.2 OpenAPI 3.0 API documentation

The HTTP contract is defined in OpenAPI 3.0 and organized into Authentication, Workflows, Executions, Workers, AI Engine, Audit, and Users.

```text
16 paths
24 operations
Bearer HMAC-SHA256 token security
Role metadata (ADMIN, OPERATOR, DEVELOPER, VIEWER)
JSON request and response schemas
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
finance-manager/
├── src/
│   ├── frontend/                     # React 18 + Vite SPA Console
│   │   ├── src/
│   │   │   ├── components/           # Shell, Topbar, BrandLogo
│   │   │   ├── features/             # Feature-driven modules (pages, hooks, services)
│   │   │   ├── lib/                  # API client, store, auth, format, icons
│   │   │   ├── App.jsx               # Routes and navigation guards
│   │   │   └── index.css             # High-tech design system (Dark & Light theme)
│   │   ├── public/                   # Static assets
│   │   └── package.json              # Frontend dependencies and test scripts
│   ├── backend/                      # Python FastAPI Async Backend
│   │   ├── app/
│   │   │   ├── api/routes/           # Endpoints: auth, workflows, executions, workers, ai, audit
│   │   │   ├── core/                 # Dependencies, exceptions, security, token service
│   │   │   ├── domain/               # Kahn's DAG engine, Pydantic models
│   │   │   ├── persistence/          # Store adapter, SQLite / PostgreSQL connection
│   │   │   └── services/             # Workflow, execution, worker, and AI services
│   │   ├── tests/                    # 16 Pytest automated test cases
│   │   ├── pyproject.toml            # Pytest configuration
│   │   └── requirements.txt          # Python dependencies
│   └── database/
│       ├── workflow_orchestrator.db  # SQLite local database
│       ├── workflow_orchestrator.sql # PostgreSQL target schema
│       └── init_db.py                # Schema initialization script
├── docs/                             # Architectural and engineering specifications
│   ├── api/                          # OpenAPI contract and usage guide
│   ├── architecture/                 # C4, arc42, class diagrams, sequence diagrams
│   ├── requirements/                 # Business rules and non-functional requirements
│   ├── traceability/                 # Cross-step master traceability matrix
│   ├── images/                       # UI screenshots and visual references
│   └── 01-scope.md … 09-step-7-readiness.md
├── run.sh                            # Unified CLI launcher (backend, frontend, test, db)
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
│   ├── workflows/       # hooks/useWorkflows.js, pages/WorkflowDefinitionsPage.jsx, services/workflowService.js
│   ├── executions/      # hooks/useExecutions.js, pages/ExecutionsPage.jsx, services/executionService.js
│   ├── workers/         # hooks/useWorkers.js, pages/WorkersPage.jsx, services/workerService.js
│   ├── audit/           # hooks/useAuditLogs.js, pages/AuditPage.jsx, services/auditService.js
│   ├── users/           # hooks/useUsers.js, pages/UsersPage.jsx, services/userService.js
│   └── profile/         # pages/ProfilePage.jsx (Self-service profile and RBAC matrix)
├── services/            # Base apiClient and HTTP utilities
├── lib/                 # Store, auth context, date/number formatting, icons
└── test/                # Setup and Vitest unit/integration tests
```

Target dependency flow:
```text
Page/Component → Feature Hook → Feature Service → apiClient → FastAPI REST API
```

### 5.3 Target FastAPI backend structure

```text
src/backend/app/
├── api/
│   ├── router.py                     # Aggregated API router
│   └── routes/                       # Modular endpoints (auth, workflows, executions, workers, ai, audit)
├── core/
│   ├── dependencies.py               # RBAC role guards and Bearer token extraction
│   ├── exceptions.py                 # RFC 7807 problem details error mapping
│   └── security.py                   # PBKDF2 password hasher & HMAC-SHA256 token service
├── domain/
│   ├── dag_engine.py                 # Kahn's algorithm, cycle validation, step readiness
│   └── models.py                     # Pydantic domain models & request/response contracts
├── persistence/
│   ├── database.py                   # Database engine, connection pooling
│   └── store.py                      # Thread-safe in-memory & relational store adapter
└── services/
    ├── ai_service.py                 # Prompt-to-DAG & failure diagnostics (Self-Healing)
    ├── execution_service.py          # State machine, step advancement, cancel execution
    ├── worker_service.py             # Heartbeat monitor, queue polling, task completion
    └── workflow_service.py           # DAG CRUD & persistence
```

---

## 6. Detailed Class and Sequence Design

Detailed design derives from the C4 components in Step 3, the database and OpenAPI contracts in Step 4, and the folder ownership in Step 5.

### 6.1 C4 Level 4 — Code collaboration

#### L4.1 Workflow Execution Management

```mermaid
flowchart TB
    subgraph execution["Execution Management [Component]"]
        direction TB
        handler["ExecutionsRouter<br/><i>[FastAPI Router]</i><br/>Parses trigger requests, extracts JWT,<br/>and serializes JSON responses"]
        service["ExecutionService<br/><i>[Python Service]</i><br/>Coordinates instance creation, step dispatch,<br/>and automatic advancement"]
        engine["DagEngine<br/><i>[Python Domain Class]</i><br/>Executes Kahn's algorithm and resolves<br/>ready dependency steps"]
        queue["WorkerService<br/><i>[Python Service]</i><br/>Dispatches scheduled tasks into<br/>isolated worker queues"]
        store["StoreAdapter<br/><i>[Persistence]</i><br/>Persists instances and task states"]

        handler --> service
        service --> engine
        service --> queue
        service --> store
    end

    web["Web Console<br/><i>[Container: React.js]</i>"]
    worker["Worker Node<br/><i>[External Worker]</i>"]
    db[("Database<br/><i>[SQLite / PostgreSQL]</i>")]

    web --> handler
    queue <--> worker
    store --> db

    style handler fill:#1168bd,color:#fff
    style service fill:#0b4f9e,color:#fff
    style engine fill:#1168bd,color:#fff
    style queue fill:#1168bd,color:#fff
    style store fill:#1168bd,color:#fff
```

#### L4.2 AI Failure Diagnostics & Self-Healing

```mermaid
flowchart TB
    subgraph ai["AI Intelligence Engine [Component]"]
        direction TB
        aiRouter["AiRouter<br/><i>[FastAPI Router]</i><br/>Receives diagnosis requests and parameters"]
        aiService["AiOrchestratorService<br/><i>[Python Service]</i><br/>Inspects execution traces, error logs,<br/>and queries LLM heuristics"]
        diagModel["AiDiagnoseFailureResponse<br/><i>[Domain Model]</i><br/>Root cause, severity, and suggested fix"]

        aiRouter --> aiService
        aiService --> diagModel
    end

    web["Web Console<br/><i>[Container: React.js]</i>"]
    execService["ExecutionService<br/><i>[Service]</i>"]

    web --> aiRouter
    aiService --> execService

    style aiRouter fill:#8b5cf6,color:#fff
    style aiService fill:#7c3aed,color:#fff
    style diagModel fill:#8b5cf6,color:#fff
```

Source: [C4 Level 4 — Code](docs/architecture/c4/04-code.md)

### 6.2 Core class diagrams

#### 1. Authentication & Identity

```mermaid
classDiagram
    direction TB

    class AuthRouter {
        +login(LoginRequest) LoginResult
        +logout(UserAccount) Response
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
        +validate_dag(DagDefinition dag) bool
        +get_ready_steps(DagDefinition dag, list completed_step_ids) list
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
    }

    class WorkflowService {
        +list_workflows() list
        +get_workflow_by_id(int id) WorkflowDefinition
        +create_workflow(WorkflowCreateRequest req, int user_id) WorkflowDefinition
    }

    class WorkflowDefinition {
        +int id
        +string name
        +int version
        +string description
        +DagDefinition dag
        +bool isActive
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
        +trigger_workflow(int workflow_id, string payload) WorkflowInstance
        +cancel_execution(int instance_id) WorkflowInstance
        +advance_workflow(int instance_id) void
    }

    class WorkerService {
        +register_worker(WorkerRegisterRequest req) WorkerNode
        +heartbeat(string worker_id) WorkerNode
        +poll_task(string worker_id) TaskExecution
        +complete_task(string worker_id, int task_id, string status) void
    }

    class WorkflowInstance {
        +int id
        +int workflowId
        +string status
        +string inputPayloadJson
        +list tasks
    }

    class TaskExecution {
        +int id
        +int instanceId
        +string stepId
        +string status
        +string queueName
        +string assignedWorkerId
        +int retryCount
    }

    ExecutionService --> WorkflowInstance
    WorkflowInstance --> TaskExecution
    WorkerService --> TaskExecution
```

Source: [Core Class Diagrams](docs/architecture/uml/01-class-diagrams.md)

### 6.3 Sequence diagrams

Runtime sequences cover authentication, workflow DAG creation with Kahn cycle validation, execution triggering and step dispatching, worker task polling, heartbeat management, and AI failure diagnostics.

```mermaid
sequenceDiagram
    autonumber
    actor Dev as Workflow Developer
    participant UI as React Console
    participant API as FastAPI Orchestrator
    participant DAG as DagEngine (Kahn's)
    participant Store as StoreAdapter / DB
    participant Worker as Distributed Worker

    Dev->>UI: Click "Trigger Run" with input payload
    UI->>API: POST /api/v1/executions/workflows/{id}/trigger
    API->>Store: Create WorkflowInstance (Status: RUNNING)
    API->>DAG: get_ready_steps(dag, completed=[])
    DAG-->>API: Returns [step-extract] (Root Step)
    API->>Store: Create TaskExecution (step-extract, SCHEDULED, queue="data-io")
    API-->>UI: 201 Created (Instance details & step progress)

    Worker->>API: POST /api/v1/workers/{workerId}/poll
    API->>Store: Match task from queue "data-io"
    API-->>Worker: Return task payload (Status: RUNNING)

    Worker->>Worker: Execute distributed data extraction
    Worker->>API: POST /api/v1/workers/{workerId}/complete-task (COMPLETED)
    API->>Store: Update step-extract = COMPLETED
    API->>DAG: get_ready_steps(dag, completed=[step-extract])
    DAG-->>API: Returns [step-transform]
    API->>Store: Schedule step-transform for queue "compute"
    API-->>UI: Live telemetry update (Progress 50%)
```

- [Core sequence diagrams](docs/architecture/uml/02-sequence-diagrams.md)
- [API runtime sequences and operation traceability](docs/architecture/uml/03-api-traceability.md)

---

## Documentation

- Requirements: [Scope](docs/01-scope.md), [Features](docs/02-features.md), [INVEST backlog](docs/08-invest-requirements.md), [Acceptance criteria](docs/06-acceptance-criteria.md).
- Requirements catalogs: [Business rules](docs/requirements/business-rules.md) and [Non-functional requirements](docs/requirements/non-functional-requirements.md).
- UI/UX: [Information architecture](docs/04-information-architecture.md).
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
- [x] Design the C4 System Context
- [x] Design the C4 Container
- [x] Design the C4 Component and arc42 documentation
- [x] Design the SQLite / PostgreSQL schema, DBML, and data relationships
- [x] Write the API documentation in OpenAPI 3.0
- [x] Design the React frontend folder structure
- [x] Design the FastAPI backend folder structure
- [x] Design class diagrams and sequence diagrams
- [x] Create traceability between requirements, screens, API, and database
- [x] Build the FastAPI async backend engine
- [x] Build the authentication, user management, and personal profile API
- [x] Implement the Kahn algorithm DAG cycle detection and validation
- [x] Implement the workflow execution state machine and step advancement
- [x] Implement the distributed worker queue dispatching (5 isolated queues)
- [x] Implement the AI Prompt-to-DAG generator and failure self-healing diagnostics
- [x] Write unit tests and API integration tests (16/16 Pytest tests pass)
- [x] Connect the React frontend to the API (login, workflows, executions, workers, users, profile, audit)
- [x] Add high-tech developer console design system with Dark / Light theme toggle
- [x] Record audit events for login, logout, workflow creation, trigger, and cancellation
- [x] Add frontend tests with Vitest (22/22 tests pass)
- [ ] Connect production-grade Kafka / RabbitMQ broker adapter for ultra-high throughput worker clusters
- [ ] Deploy multi-region Kubernetes cluster with Horizontal Pod Autoscaler (HPA) for compute workers
