# Data Model — Distributed Workflow Orchestration Platform

Tài liệu mô hình dữ liệu quan hệ của hệ thống điều phối tiến trình phân tán.

---

## 1. Sơ Đồ Thực Thể Quan Hệ (Entity Relationship Diagram)

```mermaid
erDiagram
    app_users ||--o{ workflow_definitions : "creates"
    app_users ||--o{ audit_logs : "records"
    workflow_definitions ||--o{ workflow_instances : "instantiates"
    workflow_instances ||--o{ task_executions : "contains"
    worker_nodes ||--o{ task_executions : "executes"

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
        datetime created_at
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
        datetime started_at
        datetime completed_at
    }

    worker_nodes {
        string worker_id PK
        string hostname
        string status
        json supported_queues
        int max_concurrency
        int current_load
        datetime last_heartbeat_at
        datetime registered_at
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
