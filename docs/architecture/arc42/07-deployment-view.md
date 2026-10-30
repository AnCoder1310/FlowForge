# 7. Deployment View

FlowForge supports two deployment configurations: Local Development (Embedded) and Containerized Multi-Service (Docker Compose).

```mermaid
flowchart TB
    subgraph host["Host Machine / Docker Engine"]
        subgraph frontendContainer["Frontend Container / Vite Dev Server"]
            clientApp["React SPA Console<br/>Port: 5173"]
        end

        subgraph backendContainer["FastAPI Backend Container"]
            apiService["FastAPI ASGI Server (Uvicorn)<br/>Port: 8000"]
        end

        subgraph dbContainer["PostgreSQL Container"]
            pgService["PostgreSQL 16 Alpine<br/>Port: 55432 (Internal: 5432)<br/>DB: workflow_orchestrator"]
        end
    end

    subgraph workers["Distributed Worker Cluster"]
        w1["Worker Node 01 (compute, default)"]
        w2["Worker Node 02 (data-io)"]
        w3["Worker Node 03 (ai-agent, payment)"]
    end

    clientApp -- "HTTP REST / Port 8000" --> apiService
    apiService -- "SQL / Port 55432" --> pgService
    workers -- "Task Polling & Heartbeats" --> apiService
```

## 7.1 Docker Compose Services

- **`postgres`:** PostgreSQL 16 image, exposed on `127.0.0.1:55432`.
- **`backend`:** Python 3.10+ FastAPI uvicorn daemon.
- **`frontend`:** React 18 / Vite SPA console.
