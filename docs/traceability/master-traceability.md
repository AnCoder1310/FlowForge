# Master Traceability Matrix — FlowForge (DWOP) V1

> **Trạng thái thiết kế:** TARGET V1  
> **Trạng thái kiểm thử:** 16 Pytest tests (Backend) & 22 Vitest tests (Frontend) đạt PASSED 100%

Bảng ma trận truy xuất nguồn gốc (Traceability Matrix) liên kết toàn diện từ Yêu cầu (INVEST User Stories) -> Use Case -> Giao diện (Screen) -> C4 Component -> API Endpoint -> Cơ sở dữ liệu -> Bằng chứng kiểm thử:

## 1. Ma Trận Chức Năng (Functional Traceability)

| User Story | Use Case | Tiêu chí AC | Giao diện | C4 Component | API Endpoint | Bảng CSDL | Kiểm thử thực tế |
|---|---|---|---|---|---|---|---|
| **US01** | UC01 | AC-US01 | `/login` | Identity & Access | `POST /api/v1/auth/login` | `app_users`, `audit_logs` | `test_login_success` (PASS) |
| **US02** | UC01 | AC-US02 | Shell Menu | Identity & Access | `POST /api/v1/auth/logout` | `audit_logs` | `App.test.jsx` (PASS) |
| **US03** | UC02 | AC-US03 | `/dashboard` | Dashboard & Telemetry | `GET /api/v1/metrics/dashboard` | `workflow_instances`, `task_executions`, `worker_nodes` | `test_dashboard_metrics` (PASS) |
| **US04** | UC03 | AC-US04 | `/workflows` | Workflow DAG Engine | `GET /api/v1/workflows`, `POST /api/v1/workflows` | `workflow_definitions` | `test_validate_dag_valid`, `test_validate_dag_cycle_raises` (PASS) |
| **US05** | UC04 | AC-US05 | `/workflows` (AI Modal) | AI Copilot Engine | `POST /api/v1/ai/generate-workflow` | `workflow_definitions` | `test_ai_generate_workflow_etl`, `test_ai_generate_workflow_api` (PASS) |
| **US06** | UC05 | AC-US06 | `/executions` (Trigger) | Execution Engine | `POST /api/v1/executions/workflows/{id}/trigger` | `workflow_instances`, `task_executions` | `test_trigger_workflow_creates_instance_and_scheduled_tasks` (PASS) |
| **US07** | UC07 | AC-US07 | `/executions` (Detail) | Execution State Machine | `GET /api/v1/executions/{id}`, `POST /api/v1/tasks/{id}/complete` | `workflow_instances`, `task_executions` | `test_get_ready_steps_dependency_resolved` (PASS) |
| **US08** | UC06 | AC-US08 | `/executions` (Cancel) | Execution Engine | `POST /api/v1/executions/{id}/cancel` | `workflow_instances`, `task_executions`, `audit_logs` | `test_cancel_running_execution` (PASS) |
| **US09** | UC08 | AC-US09 | `/executions` (AI Panel) | AI Self-Healing Engine | `POST /api/v1/ai/diagnose-failure` | `task_executions`, `workflow_instances` | `test_ai_diagnose_failure_timeout` (PASS) |
| **US10** | UC09 | AC-US10 | `/workers` | Distributed Worker Fleet | `GET /api/v1/workers`, `POST /api/v1/tasks/poll`, `/heartbeat` | `worker_nodes`, `task_executions` | `test_worker_registration_and_heartbeat`, `test_worker_poll_and_complete_task` (PASS) |
| **US11** | UC10 | AC-US11 | `/audit` | Audit Trail & Compliance | `GET /api/v1/audit` | `audit_logs` | `test_audit_trail_recorded` (PASS) |
| **US12** | UC11 | AC-US12 | `/users` | User & RBAC Management | `GET /api/v1/users`, `POST /api/v1/users` | `app_users`, `audit_logs` | `test_user_rbac_policies` (PASS) |
| **US13** | UC02 | AC-US13 | `/profile` | Profile & Credentials | `GET /api/v1/profile`, `PUT /api/v1/profile/password` | `app_users`, `audit_logs` | `test_password_update` (PASS) |
