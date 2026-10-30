# Class Diagrams — Remaining FlowForge (DWOP) Modules

> **Design status:** TARGET V1  
> **Implementation status:** IMPLEMENTED AND VERIFIED (Python FastAPI & Pydantic Domain)

These diagrams describe the remaining subsystem models: Telemetry Metrics, Audit Logging, and User / Profile Management.

## 1. Cluster Metrics & Telemetry

```mermaid
classDiagram
    direction TB
    class MetricsRouter {
        +get_dashboard_metrics() ClusterMetricsResponse
    }
    class MetricsService {
        +get_dashboard_metrics() ClusterMetricsResponse
    }
    class ClusterMetricsResponse {
        +int activeWorkflowsCount
        +int runningExecutionsCount
        +int onlineWorkersCount
        +int queuedTasksCount
        +dict queueDistribution
        +list recentExecutions
    }
    class StoreAdapter {
        +get_dashboard_metrics() dict
    }

    MetricsRouter --> MetricsService
    MetricsService --> StoreAdapter
    MetricsService --> ClusterMetricsResponse
```

## 2. Audit Trail & Compliance

```mermaid
classDiagram
    direction TB
    class AuditRouter {
        +list_audit_logs(string action, int limit) List~AuditLog~
    }
    class AuditService {
        +list_logs(string action, int limit) List~AuditLog~
        +record_audit(string action, string module, string detail, int actor_id) void
    }
    class AuditLog {
        +int id
        +string action
        +string module
        +string detail
        +int actorUserId
        +string actorUsername
        +datetime timestamp
    }
    class StoreAdapter {
        +get_audit_logs() List~AuditLog~
        +record_audit(action, module, detail, user_id) void
    }

    AuditRouter --> AuditService
    AuditService --> StoreAdapter
    AuditService --> AuditLog
```

## 3. User & Profile Management

```mermaid
classDiagram
    direction TB
    class UsersRouter {
        +list_users() List~SafeUser~
        +create_user(CreateUserRequest req) SafeUser
        +update_status(int user_id, UpdateStatusRequest req) SafeUser
    }
    class ProfileRouter {
        +get_profile(UserAccount current_user) SafeUser
        +change_password(ChangePasswordRequest req, UserAccount user) Response
    }
    class UserService {
        +list_users() List~SafeUser~
        +create_user(CreateUserRequest req) SafeUser
        +set_active(int user_id, bool is_active) SafeUser
    }
    class ProfileService {
        +change_password(int user_id, string old_pwd, string new_pwd) bool
    }
    class PasswordService {
        +hash_password(string password) string
        +verify_password(string hash, string password) bool
    }
    class StoreAdapter {
        +list_users() list
        +add_user(user) UserAccount
        +update_user_status(user_id, status) UserAccount
    }

    UsersRouter --> UserService
    ProfileRouter --> ProfileService
    UserService --> PasswordService
    UserService --> StoreAdapter
    ProfileService --> PasswordService
    ProfileService --> StoreAdapter
```
