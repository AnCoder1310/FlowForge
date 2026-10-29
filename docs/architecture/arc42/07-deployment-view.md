# 7. Deployment View

## 7.1 Current State — Local Mock

```mermaid
flowchart LR
    subgraph machine["Development machine"]
        browser["Browser<br/><i>React runtime</i>"]
        vite["Vite dev server<br/><i>static assets/HMR</i>"]
        mock["JavaScript mock data<br/>Web Storage session"]
        docker["Docker Compose"]
        pg[("PostgreSQL<br/>container 5432 / host 5433")]
        browser -->|"HTTP"| vite
        browser --> mock
        docker --> pg
    end
    mock -.->|"not connected"| pg
    style browser fill:#1168bd,color:#fff
    style vite fill:#3a7bd5,color:#fff
    style mock fill:#3a7bd5,color:#fff
    style pg fill:#999,color:#fff
    style machine fill:#f8fbff,stroke:#1168bd,stroke-dasharray:5 5
```

The frontend runs with `npm run dev`; PostgreSQL can run independently through Docker Compose, but the frontend does not call the database.

## 7.2 Target Architecture — Logical Topology

```mermaid
flowchart LR
    device["Client device<br/><i>Browser</i>"]
    web["Web hosting node<br/><i>React static assets</i>"]
    api["Application node<br/><i>ASP.NET Core application</i>"]
    db[("Database node<br/><i>PostgreSQL</i>")]
    device -->|"HTTPS"| web
    web -->|"HTTPS / REST / JSON"| api
    api -->|"TLS / PostgreSQL protocol"| db
    style device fill:#666,color:#fff
    style web fill:#3a7bd5,color:#fff
    style api fill:#1168bd,color:#fff
    style db fill:#3a7bd5,color:#fff
```

This is a logical topology and does not select a cloud provider, container orchestrator, reverse proxy, or CDN.

## 7.3 Container-to-Node Mapping

| Container | Current local state | Target production state |
|---|---|---|
| React Web | Vite dev server + browser | Static web hosting provider: OPEN, operator-owned before go-live |
| .NET Backend | Implementation status assessed separately | One or more ASP.NET Core instances; host/topology OPEN before go-live |
| PostgreSQL | Docker Compose | Managed or self-hosted PostgreSQL; provider OPEN before go-live |

## 7.4 Deployment requirements

- Expose only required public HTTPS endpoints; PostgreSQL is not public on the Internet.
- Do not commit secrets to Git; use an appropriate environment or secret manager.
- Run controlled database migrations before deploying a backend version that requires the new schema.
- Separate liveness and readiness health checks when the backend is implemented.
- Backup/restore, TLS termination, scaling, and observability must be decided before production.
