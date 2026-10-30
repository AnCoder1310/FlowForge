# Sequence Diagrams — FlowForge (DWOP)

The sequence diagrams document the key execution paths in the Distributed Workflow Orchestration Platform.

## 1. Authentication — `POST /api/v1/auth/login`

```mermaid
sequenceDiagram
    actor User as User / Operator
    participant UI as React Console
    participant API as AuthRouter
    participant Sec as PasswordService
    participant Tok as TokenService
    participant DB as SQLite / PostgreSQL

    User->>UI: Enter email & password
    UI->>API: POST /api/v1/auth/login
    API->>DB: Query user by email
    DB-->>API: User record (with password_hash)
    
    API->>Sec: verify_password(hash, password)
    alt Invalid password or user inactive
        Sec-->>API: False
        API-->>UI: 401 Unauthorized (INVALID_CREDENTIALS)
        UI-->>User: Display error message
    else Password valid
        Sec-->>API: True
        API->>Tok: issue(user_id, role)
        Tok-->>API: HMAC-SHA256 Token
        API->>DB: Record audit log (LOGIN)
        API-->>UI: 200 OK (token, user details)
        UI-->>User: Redirect to Dashboard
    end
```

## 2. Workflow Creation with Kahn Cycle Detection — `POST /api/v1/workflows`

```mermaid
sequenceDiagram
    actor Dev as Workflow Developer
    participant UI as React Console
    participant API as WorkflowsRouter
    participant Engine as DagEngine (Kahn's Algorithm)
    participant DB as Database Store

    Dev->>UI: Submit DAG definition (steps & dependencies)
    UI->>API: POST /api/v1/workflows
    API->>Engine: validate_dag(dag)
    
    Engine->>Engine: Compute in-degrees of all steps
    Engine->>Engine: Topological queue traversal
    
    alt Cycle detected (in-degree never reaches 0 for some nodes)
        Engine-->>API: Raise AppException("Cyclic dependency detected")
        API-->>UI: 400 Bad Request (CYCLE_DETECTED)
        UI-->>Dev: Highlight cyclic step error
    else DAG is valid (0 cycles)
        Engine-->>API: Validation passed
        API->>DB: Save workflow definition & steps JSON
        API->>DB: Record audit log (CREATE_WORKFLOW)
        API-->>UI: 201 Created (workflow_id, version)
        UI-->>Dev: Display DAG in visualizer
    end
```

## 3. Execution Triggering & Worker Task Polling

```mermaid
sequenceDiagram
    actor Op as Operations Lead
    participant UI as React Console
    participant ExecAPI as ExecutionsRouter
    participant ExecSvc as ExecutionService
    participant Engine as DagEngine
    participant Worker as Worker Node Daemon
    participant TaskAPI as TasksRouter
    participant Store as Data Store

    Op->>UI: Click "Trigger Run" with input payload
    UI->>ExecAPI: POST /api/v1/executions/workflows/{id}/trigger
    ExecAPI->>ExecSvc: trigger_workflow(id, payload, actor)
    ExecSvc->>Store: Create WorkflowInstance (RUNNING)
    ExecSvc->>Engine: get_ready_steps(dag, completed={}, executed={})
    Engine-->>ExecSvc: [Root steps with 0 dependencies]
    ExecSvc->>Store: Schedule initial tasks into isolated queues
    ExecAPI-->>UI: 200 OK (instance_id, scheduled_tasks)

    loop Asynchronous Worker Polling
        Worker->>TaskAPI: POST /api/v1/tasks/poll (worker_id, queues=["compute"])
        TaskAPI->>Store: Find oldest SCHEDULED task in supported queues
        alt Task available
            Store-->>TaskAPI: Task #101
            TaskAPI->>Store: Update task status -> RUNNING (assign worker_id)
            TaskAPI-->>Worker: 200 OK (Task #101 payload)
            Worker->>Worker: Execute computation
            Worker->>TaskAPI: POST /api/v1/tasks/101/complete (output_payload)
            TaskAPI->>ExecSvc: complete_task(101, output)
            ExecSvc->>Engine: get_ready_steps (check next steps)
            ExecSvc->>Store: Schedule dependent step #102 into queue
            TaskAPI-->>Worker: 200 OK
        else No task ready
            TaskAPI-->>Worker: 200 OK (task: null)
        end
    end
```

## 4. AI Failure Diagnostics & Self-Healing

```mermaid
sequenceDiagram
    actor Op as Operations Lead
    participant UI as React Console
    participant API as AiRouter
    participant AiSvc as AiOrchestratorService
    participant Store as Data Store
    participant LLM as External LLM / Heuristics

    UI->>API: POST /api/v1/ai/diagnose-failure (instance_id, task_id)
    API->>AiSvc: diagnose_failure(instance_id, task_id)
    AiSvc->>Store: Retrieve task execution error log & retry history
    Store-->>AiSvc: Error trace ("Worker node compute timeout after 300s")
    AiSvc->>LLM: Analyze trace, error patterns, and DAG context
    LLM-->>AiSvc: Root Cause + Suggested Fix + canAutoRetry
    AiSvc-->>API: AiDiagnoseFailureResponse
    API-->>UI: 200 OK (root cause, fix recommendations)
    UI-->>Op: Render AI Self-Healing Card with "Retry" action
```
