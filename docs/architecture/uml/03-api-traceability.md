# API Traceability & Route Mapping — FlowForge (DWOP)

Every FastAPI endpoint maps directly to a use case, responsible service, authorization policy, and database entity:

| HTTP Method & Path | Use Case | RBAC Authorization | Service & Domain Handler | Database Tables |
|---|---|---|---|---|
| `POST /api/v1/auth/login` | UC01 | Public | `AuthRouter` -> `PasswordService`, `TokenService` | `app_users`, `audit_logs` |
| `POST /api/v1/auth/logout` | UC01 | Authenticated | `AuthRouter` | `audit_logs` |
| `GET /api/v1/workflows` | UC03 | All Roles | `WorkflowService.list_workflows()` | `workflow_definitions` |
| `POST /api/v1/workflows` | UC03 | Admin, Developer | `WorkflowService.create_workflow()`, `DagEngine` | `workflow_definitions`, `audit_logs` |
| `GET /api/v1/workflows/{id}` | UC03 | All Roles | `WorkflowService.get_workflow_by_id()` | `workflow_definitions` |
| `GET /api/v1/executions` | UC07 | All Roles | `ExecutionService.list_executions()` | `workflow_instances`, `task_executions` |
| `POST /api/v1/executions/workflows/{id}/trigger` | UC05 | Admin, Operator, Dev | `ExecutionService.trigger_workflow()` | `workflow_instances`, `task_executions`, `audit_logs` |
| `GET /api/v1/executions/{id}` | UC07 | All Roles | `ExecutionService.get_execution_detail()` | `workflow_instances`, `task_executions` |
| `POST /api/v1/executions/{id}/cancel` | UC06 | Admin, Operator | `ExecutionService.cancel_execution()` | `workflow_instances`, `task_executions`, `audit_logs` |
| `POST /api/v1/tasks/poll` | UC09 | Worker Node / Service | `WorkerService.poll_task()` | `task_executions`, `worker_nodes` |
| `POST /api/v1/tasks/{id}/complete` | UC09 | Worker Node / Service | `ExecutionService.complete_task()` | `task_executions`, `workflow_instances` |
| `POST /api/v1/tasks/{id}/fail` | UC09 | Worker Node / Service | `ExecutionService.fail_task()` | `task_executions`, `workflow_instances` |
| `GET /api/v1/workers` | UC09 | All Roles | `WorkerService.list_workers()` | `worker_nodes` |
| `POST /api/v1/workers/register` | UC09 | Worker Node | `WorkerService.register_worker()` | `worker_nodes` |
| `POST /api/v1/workers/{id}/heartbeat` | UC09 | Worker Node | `WorkerService.worker_heartbeat()` | `worker_nodes` |
| `POST /api/v1/ai/generate-workflow` | UC04 | Admin, Developer | `AiOrchestratorService.generate_workflow()` | In-memory validation |
| `POST /api/v1/ai/diagnose-failure` | UC08 | Admin, Operator, Dev | `AiOrchestratorService.diagnose_failure()` | `task_executions`, `workflow_instances` |
| `GET /api/v1/metrics/dashboard` | UC02 | All Roles | `MetricsService.get_dashboard_metrics()` | All tables (aggregates) |
| `GET /api/v1/audit` | UC10 | Admin, Operator | `AuditService.list_logs()` | `audit_logs` |
| `GET /api/v1/users` | UC11 | Admin Only | `UserService.list_users()` | `app_users` |
| `POST /api/v1/users` | UC11 | Admin Only | `UserService.create_user()` | `app_users`, `audit_logs` |
| `PUT /api/v1/users/{id}/status` | UC11 | Admin Only | `UserService.update_status()` | `app_users`, `audit_logs` |
| `GET /api/v1/profile` | UC02 | Authenticated | `ProfileService.get_profile()` | `app_users` |
| `PUT /api/v1/profile/password` | UC02 | Authenticated | `ProfileService.change_password()` | `app_users`, `audit_logs` |
