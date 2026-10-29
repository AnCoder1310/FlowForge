# Distributed Workflow Orchestration Platform — Backend Engine

FastAPI Async Backend điều phối tiến trình phân tán theo đồ thị DAG (Directed Acyclic Graph).

```text
src/backend/
├── app/
│   ├── api/
│   │   ├── router.py             # Tổng hợp các Router
│   │   └── routes/               # Endpoints: auth, workflows, executions, workers, ai, audit
│   ├── core/
│   │   ├── dependencies.py       # RBAC & Token Injection
│   │   ├── exceptions.py         # Chuẩn hóa AppException (RFC 7807)
│   │   └── security.py           # PBKDF2 Password Hashing & HMAC-SHA256 Token
│   ├── domain/
│   │   ├── dag_engine.py         # Thuật toán Kahn phát hiện chu trình & giải phóng step
│   │   └── models.py             # Pydantic Schemas & Data Contracts
│   ├── persistence/
│   │   ├── database.py           # Kết nối SQLite / PostgreSQL
│   │   └── store.py              # In-memory & Database Adapter
│   └── services/
│       ├── ai_service.py         # AI Prompt-to-DAG & Failure Diagnostics (Self-Healing)
│       ├── execution_service.py  # Máy trạng thái vòng đời Task (State Machine)
│       ├── worker_service.py     # Quản lý Worker Heartbeat & Task Queues
│       └── workflow_service.py   # Quản lý định nghĩa DAG
├── tests/                        # Toàn bộ 16 bài Pytest tự động
│   ├── test_ai_service.py
│   ├── test_dag_engine.py
│   ├── test_worker_tasks.py
│   └── test_workflow_api.py
├── pyproject.toml
└── requirements.txt
```

---

## 1. Các Giải Thuật Cốt Lõi

1. **DAG Cycle Detection (Kahn's Algorithm):** Kiểm tra bậc vào (*in-degree*) của các node để đảm bảo đồ thị tuần tự không bao giờ có vòng lặp kín gây deadlock.
2. **Step Advancement State Machine:** Khi một task chuyển sang `COMPLETED`, engine tự động đánh giá các step phụ thuộc và đưa vào hàng đợi `SCHEDULED`.
3. **Queue Isolation Dispatcher:** Điều phối tác vụ tới 5 hàng đợi độc lập (`default`, `compute`, `data-io`, `payment`, `ai-agent`).
4. **Worker Heartbeat & Fault Recovery:** Tự động thu hồi task và retry khi worker bị mất kết nối (Heartbeat timeout).

---

## 2. Hướng Dẫn Chạy & Kiểm Thử

### Cài đặt thư viện:
```bash
pip install -r requirements.txt
```

### Chạy máy chủ phát triển (Port 8000):
```bash
python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### Chạy kiểm thử tự động (Pytest):
```bash
python3 -m pytest -v
```

Swagger API UI được tích hợp sẵn tại: **http://127.0.0.1:8000/docs**
