# Class Diagrams — FlowForge (DWOP)

The class diagrams follow the implementation in `src/backend/app/` covering Domain Models, Services, and FastAPI Routers.

## 1. Authentication & Identity

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

    class StoreAdapter {
        +get_user_by_email(string email) UserAccount
        +get_user_by_id(int id) UserAccount
        +record_audit(string action, string module, string detail, int user_id)
    }

    AuthRouter --> LoginRequest
    AuthRouter --> LoginResult
    AuthRouter --> TokenService
    AuthRouter --> PasswordService
    AuthRouter --> StoreAdapter
    LoginResult --> SafeUser
```

## 2. Workflow & DAG Engine

```mermaid
classDiagram
    direction TB

    class DagEngine {
        +validate_dag(DagDefinition dag) void
        +get_ready_steps(DagDefinition dag, set completed, set executed) list
    }

    class DagDefinition {
        +List~DagStep~ steps
    }

    class DagStep {
        +string id
        +string name
        +TaskType type
        +string queue
        +List~string~ dependsOn
        +int maxRetries
        +int timeoutSeconds
    }

    class WorkflowService {
        +list_workflows() List~WorkflowDefinition~
        +get_workflow_by_id(int id) WorkflowDefinition
        +create_workflow(WorkflowCreateRequest req, int user_id) WorkflowDefinition
    }

    WorkflowService --> DagEngine
    WorkflowService --> DagDefinition
    DagDefinition *-- DagStep
```

## 3. Execution Lifecycle & Distributed Workers

```mermaid
classDiagram
    direction TB

    class ExecutionService {
        +trigger_workflow(int wf_id, TriggerRequest req, UserAccount user) WorkflowInstance
        +get_execution_detail(int instance_id) dict
        +cancel_execution(int instance_id, UserAccount user) WorkflowInstance
        +complete_task(int task_id, CompleteTaskRequest req) TaskExecution
        +fail_task(int task_id, FailTaskRequest req) TaskExecution
    }

    class WorkerService {
        +register_worker(RegisterWorkerRequest req) WorkerNode
        +worker_heartbeat(string worker_id) WorkerNode
        +poll_task(PollTaskRequest req) PollTaskResponse
        +list_workers() List~WorkerNode~
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
        +StepStatus status
        +string queueName
        +string assignedWorkerId
        +int retryCount
    }

    class WorkerNode {
        +string workerId
        +string hostname
        +WorkerStatus status
        +List~string~ supportedQueues
        +int maxConcurrency
        +int activeTasksCount
        +datetime lastHeartbeatAt
    }

    ExecutionService --> DagEngine
    ExecutionService --> WorkflowInstance
    ExecutionService --> TaskExecution
    WorkerService --> WorkerNode
    WorkerService --> TaskExecution
```

## 4. AI Copilot & Failure Self-Healing

```mermaid
classDiagram
    direction TB

    class AiOrchestratorService {
        +generate_workflow(string prompt) AiGenerateWorkflowResponse
        +diagnose_failure(int instance_id, int task_id) AiDiagnoseFailureResponse
    }

    class AiGenerateWorkflowResponse {
        +string name
        +string description
        +DagDefinition dag
        +string reasoning
    }

    class AiDiagnoseFailureResponse {
        +int instanceId
        +int taskId
        +string errorSummary
        +string rootCause
        +string suggestedFix
        +bool canAutoRetry
    }

    AiOrchestratorService --> AiGenerateWorkflowResponse
    AiOrchestratorService --> AiDiagnoseFailureResponse
    AiGenerateWorkflowResponse --> DagDefinition
```
