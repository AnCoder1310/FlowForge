# Architecture & Target Folder Structure — Distributed Workflow Orchestration Platform

> **Phạm vi:** DWOP Production Architecture  
> **Backend:** Python FastAPI (Uvicorn ASGI)  
> **Frontend:** React 18 + Vite Feature-Driven Architecture  

---

## 1. Nguyên Tắc Thiết Kế Chung (General Principles)

1. **Phân tách tầng trách nhiệm (Separation of Concerns):** API Controllers chỉ làm nhiệm vụ parse request/response; Business Logic nằm tại Services; Thuật toán DAG nằm tại Domain Engine; Data Access nằm tại Persistence.
2. **Feature-Driven Frontend:** Giao diện được module hóa theo tính năng nghiệp vụ (`features/<name>/{hooks, pages, services}`).
3. **Stateless API:** Master Orchestrator không lưu session trong memory; xác thực bằng Bearer token HMAC-SHA256.
4. **Queue Isolation:** Worker nodes được phân bổ các tác vụ chuyên biệt dựa trên hàng đợi (`default`, `compute`, `data-io`, `payment`, `ai-agent`).

---

## 2. Cấu Trúc Toàn Bộ Dự Án

```text
FlowForge/
├── .env                              # Cấu hình biến môi trường cục bộ
├── .env.example                      # Mẫu biến môi trường
├── compose.yaml                      # Docker Compose chạy PostgreSQL
├── run.sh                            # Script khởi động hợp nhất (backend, frontend, test, db)
│
├── src/
│   ├── backend/                      # Backend FastAPI Engine
│   │   ├── app/
│   │   │   ├── api/
│   │   │   │   ├── router.py         # Điểm gắn kết tất cả APIRouters
│   │   │   │   └── routes/           # Các endpoints (auth, workflows, executions, workers, ai, audit)
│   │   │   ├── core/
│   │   │   │   ├── dependencies.py   # RBAC & Token validation
│   │   │   │   ├── exceptions.py     # Chuẩn hóa lỗi AppException (RFC 7807)
│   │   │   │   └── security.py       # PBKDF2 Hashing & HMAC-SHA256 Token
│   │   │   ├── domain/
│   │   │   │   ├── dag_engine.py     # Giải thuật Kahn Topological Sort (Cycle Detection)
│   │   │   │   └── models.py         # Pydantic Schemas & Data Contracts
│   │   │   ├── persistence/
│   │   │   │   ├── database.py       # Kết nối SQLite & PostgreSQL
│   │   │   │   └── store.py          # Store adapter
│   │   │   ├── services/
│   │   │   │   ├── ai_service.py     # Prompt-to-DAG & Failure Diagnostics
│   │   │   │   ├── execution_service.py # State Machine quản lý task lifecycle
│   │   │   │   ├── worker_service.py # Heartbeat & Queue Polling
│   │   │   │   └── workflow_service.py # DAG CRUD
│   │   │   ├── config.py             # Nạp biến môi trường bằng pydantic / dotenv
│   │   │   └── main.py               # Khởi tạo FastAPI Application
│   │   ├── tests/                    # 16 Pytest test cases
│   │   │   ├── test_ai_service.py
│   │   │   ├── test_dag_engine.py
│   │   │   ├── test_worker_tasks.py
│   │   │   └── test_workflow_api.py
│   │   ├── pyproject.toml
│   │   └── requirements.txt
│   │
│   ├── database/                     # Hạ tầng CSDL
│   │   ├── workflow_orchestrator.db  # CSDL SQLite mặc định
│   │   ├── workflow_orchestrator.sql # Schema PostgreSQL
│   │   ├── sample_workflows.sql      # Seed dữ liệu DAG mẫu
│   │   └── init_db.py                # Script tự động khởi tạo CSDL
│   │
│   └── frontend/                     # Frontend React 18 + Vite Console
│       ├── src/
│       │   ├── components/           # UI Dùng chung (Shell, Topbar, BrandLogo)
│       │   ├── features/             # Feature-driven modules
│       │   │   ├── auth/             # Login, auth service, useAuth
│       │   │   │   ├── hooks/useAuth.js
│       │   │   │   ├── pages/Login.jsx
│       │   │   │   └── services/authService.js
│       │   │   ├── dashboard/        # KPI cards, Telemetry
│       │   │   │   ├── hooks/useDashboard.js
│       │   │   │   ├── pages/Dashboard.jsx
│       │   │   │   └── services/dashboardService.js
│       │   │   ├── workflows/        # DAG Visualizer, Prompt-to-DAG
│       │   │   │   ├── hooks/useWorkflows.js
│       │   │   │   ├── pages/WorkflowDefinitionsPage.jsx
│       │   │   │   └── services/workflowService.js
│       │   │   ├── executions/       # Real-time run timeline & AI Self-Healing
│       │   │   │   ├── hooks/useExecutions.js
│       │   │   │   ├── pages/ExecutionsPage.jsx
│       │   │   │   └── services/executionService.js
│       │   │   ├── workers/          # Cluster Worker Nodes & 5 Queues
│       │   │   │   ├── hooks/useWorkers.js
│       │   │   │   ├── pages/WorkersPage.jsx
│       │   │   │   └── services/workerService.js
│       │   │   ├── audit/            # Immutable Audit Trail
│       │   │   │   ├── hooks/useAuditLogs.js
│       │   │   │   ├── pages/AuditPage.jsx
│       │   │   │   └── services/auditService.js
│       │   │   ├── users/            # RBAC User Management
│       │   │   │   ├── hooks/useUsers.js
│       │   │   │   ├── pages/UsersPage.jsx
│       │   │   │   └── services/userService.js
│       │   │   └── profile/          # Hồ sơ cá nhân & ma trận quyền
│       │   │       └── pages/ProfilePage.jsx
│       │   ├── lib/                  # HTTP client, Icons, Auth context
│       │   ├── index.css             # High-tech Design System (Dark/Light mode)
│       │   ├── App.jsx               # Route Guards & Shell Provider
│       │   └── main.jsx
│       ├── package.json
│       └── vite.config.js
│
└── docs/                             # Tài liệu kiến trúc phần mềm
    ├── 01-scope.md                   # Phạm vi bài toán phân tán
    ├── 02-features.md                # Đặc tả 12 tính năng
    ├── 03-use-cases.md               # Sơ đồ và ca sử dụng
    ├── 04-information-architecture.md# Kiến trúc thông tin & UX
    ├── 05-data-model.md              # Sơ đồ ERD
    ├── 07-folder-structure.md        # Cấu trúc thư mục (file này)
    └── DATABASE.md                   # Hướng dẫn CSDL
