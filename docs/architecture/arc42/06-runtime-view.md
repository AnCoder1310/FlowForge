# 6. Runtime View

The runtime view describes dynamic execution scenarios across FlowForge components.

## 6.1 Authentication

```mermaid
sequenceDiagram
    actor U as User
    participant W as React Web Console
    participant A as FastAPI AuthRouter
    participant S as Password & Token Service
    participant D as Store (SQLite / PostgreSQL)
    U->>W: Enter email & password
    W->>A: POST /api/v1/auth/login
    A->>D: Find user by email
    D-->>A: User record
    A->>S: verify_password(hash, password)
    S-->>A: Verified
    A->>S: Issue HMAC-SHA256 token
    A->>D: Insert audit log (LOGIN)
    A-->>W: Token + SafeUser
    W-->>U: Navigate to Dashboard
```

## 6.2 Workflow DAG Validation & Creation

```mermaid
sequenceDiagram
    actor Dev as Workflow Developer
    participant W as React Web Console
    participant A as WorkflowsRouter
    participant E as DagEngine (Kahn's Algorithm)
    participant D as Database Store
    Dev->>W: Submit DAG definition JSON
    W->>A: POST /api/v1/workflows
    A->>E: validate_dag(dag)
    E->>E: Check duplicate step IDs & missing dependencies
    E->>E: Run Kahn topological cycle detection
    alt Cycle detected
        E-->>A: AppException("Cyclic dependency detected")
        A-->>W: 400 Bad Request (CYCLE_DETECTED)
    else Zero cycles
        E-->>A: Valid
        A->>D: Save WorkflowDefinition
        A->>D: Insert audit log (CREATE_WORKFLOW)
        A-->>W: 201 Created (workflow_id)
    end
```

## 6.3 Trigger Execution & Worker Polling Loop

```mermaid
sequenceDiagram
    actor Op as Operations Lead
    participant W as React Web Console
    participant A as ExecutionsRouter
    participant E as ExecutionService
    participant Q as WorkerService (5 Queues)
    participant Node as Worker Node Daemon
    Op->>W: Click "Trigger Run"
    W->>A: POST /api/v1/executions/workflows/{id}/trigger
    A->>E: trigger_workflow(id, payload)
    E->>E: Create WorkflowInstance (RUNNING)
    E->>E: Identify root steps with 0 dependencies
    E->>Q: Enqueue initial tasks to respective queues
    A-->>W: 200 OK (instance_id)

    Node->>Q: POST /api/v1/tasks/poll (queues=["compute"])
    Q-->>Node: Task #101 (SCHEDULED -> RUNNING)
    Node->>Node: Execute computation
    Node->>A: POST /api/v1/tasks/101/complete (result)
    A->>E: complete_task(101)
    E->>E: Resolve dependent steps (dependsOn)
    E->>Q: Enqueue next ready tasks
```

## 6.4 AI Failure Diagnostics & Self-Healing

```mermaid
sequenceDiagram
    actor Op as Operations Lead
    participant W as React Web Console
    participant A as AiRouter
    participant AI as AiOrchestratorService
    participant D as Database Store
    Op->>W: Request failure diagnosis for failed task
    W->>A: POST /api/v1/ai/diagnose-failure
    A->>AI: diagnose_failure(instance_id, task_id)
    AI->>D: Fetch task error log & retry history
    AI->>AI: Heuristic failure analysis & prompt LLM
    AI-->>A: Root cause, error severity, suggested fix, canAutoRetry
    A-->>W: 200 OK (AiDiagnoseFailureResponse)
    W-->>Op: Render Self-Healing guidance & Quick Retry action
```
