# 2. Architecture Constraints

## 2.1 Technical Constraints

| Constraint | Value / Technology | Rationale |
|---|---|---|
| **Frontend Framework** | **React 18 + Vite SPA** | Fast load times, responsive UI, component modularity. |
| **Backend Engine** | **Python 3.10+ FastAPI** | High performance async ASGI, native OpenAPI schema generation. |
| **DAG Cycle Algorithm** | **Kahn's Algorithm (Topological Sort)** | $O(V + E)$ deterministic cycle detection before persisting any workflow. |
| **Task Queue Isolation** | **5 Isolated Queues** | `default`, `compute`, `data-io`, `payment`, `ai-agent`. |
| **Database Support** | **SQLite & PostgreSQL 16+** | Local lightweight SQLite file; containerized PostgreSQL in Docker Compose. |
| **API Protocol** | **RESTful JSON over HTTPS** | OpenAPI 3.0+ compliant with RFC 7807 Problem Details error formats. |
| **Authentication** | **HMAC-SHA256 Bearer Token** | Stateless tokens signed with secret key; configurable 24-hour expiration. |
| **Password Storage** | **PBKDF2-HMAC-SHA256** | 100,000 iterations with 16-byte cryptographically secure random salt. |
| **AI Integration** | **LLM Copilot & Heuristics** | Prompt-to-DAG generation and automated failure root cause diagnostics. |

## 2.2 Operational Conventions

| Convention | Description |
|---|---|
| **Role Enum** | `ADMIN`, `OPERATOR`, `DEVELOPER`, `VIEWER` strictly enforced on server. |
| **Execution States** | `PENDING`, `RUNNING`, `COMPLETED`, `FAILED`, `CANCELLED`. |
| **Step States** | `PENDING`, `SCHEDULED`, `RUNNING`, `COMPLETED`, `FAILED`, `CANCELLED`, `TIMED_OUT`. |
| **Worker Heartbeat** | Periodic ping (10-30s); timeout after 60s transitions worker to `OFFLINE`. |
| **Audit Verbs** | `LOGIN`, `LOGOUT`, `CREATE`, `TRIGGER`, `CANCEL`, `UPDATE`, `COMPLETE`, `FAIL`. |
