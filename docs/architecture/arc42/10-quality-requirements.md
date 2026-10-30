# 10. Quality Requirements

| Quality Goal | Scenario | Expected Outcome |
|---|---|---|
| **Orchestration Correctness** | A developer creates a DAG with a circular dependency (e.g. A -> B -> C -> A). | System rejects the workflow with 400 Bad Request and `CYCLE_DETECTED`. Zero cyclic DAGs persisted. |
| **Queue Isolation** | 100 heavy compute tasks saturate `compute` queue while a priority payment task arrives on `payment`. | Payment worker immediately picks up the task without starvation from compute queue. |
| **Security & RBAC** | A `VIEWER` sends a POST request to trigger a workflow run. | Backend returns 403 Forbidden. No execution instance is created. |
| **Observability** | A task fails due to a network timeout. | System logs the failure, updates step status to `FAILED`, and AI diagnostics provides root cause analysis within 1 second. |
