# Distributed Workflow Orchestration Platform (DWOP)

## 1. Master Orchestrator (Backend Core)
### 1.1. Kiến Trúc FastAPI Async
- Framework FastAPI chạy trên nền tảng Uvicorn ASGI
- Kiến trúc phân tầng Clean Architecture (API, Core, Domain, Persistence, Services)
- Stateless REST API chuẩn hóa mã lỗi RFC 7807 (Problem Details)
- Tương thích OpenAPI 3.1 & Swagger UI tích hợp sẵn

### 1.2. Đồ Thị DAG & Thuật Toán Lập Lịch
- Giải thuật Kahn Topological Sort phát hiện chu trình lặp (Cycle Detection)
- Cam kết bảo đảm không deadlock (0-Cycle Guaranteed)
- Dependency Resolver: Tự động giải phóng các step kế tiếp khi step trước COMPLETED
- Hỗ trợ rẽ nhánh song song (Fan-out) và hội tụ luồng (Fan-in)

### 1.3. Máy Trạng Thái Thực Thi (Execution State Machine)
- Quản lý vòng đời lượt chạy: PENDING → RUNNING → COMPLETED / FAILED / CANCELLED
- Quản lý vòng đời tác vụ: PENDING → SCHEDULED → RUNNING → COMPLETED
- Cơ chế hủy bỏ khẩn cấp lượt chạy (Execution Cancellation)
- Chính sách thử lại (Retry Policy với maxRetries) và kiểm soát timeoutSeconds

---

## 2. Cụm Worker Phân Tán (Distributed Worker Cluster)
### 2.1. Quản Lý Sức Khỏe Worker
- Cơ chế Heartbeat định kỳ kiểm tra tín hiệu sống
- Tự động đánh dấu OFFLINE khi mất kết nối quá hạn timeout
- Thu hồi và điều phối lại tác vụ dở dang khi Worker gặp sự cố (Task Reclamation)

### 2.2. Phân Tách Hàng Đợi (Queue Isolation)
- Hàng đợi `default`: Điều phối và tác vụ HTTP I/O nhẹ
- Hàng đợi `compute`: Tính toán dữ liệu nặng, tác vụ CPU-bound
- Hàng đợi `data-io`: Thao tác dữ liệu, truy vấn CSDL, tải tệp S3
- Hàng đợi `payment`: Xử lý giao dịch qua cổng thanh toán bảo mật
- Hàng đợi `ai-agent`: Suy luận mô hình LLM và tác vụ tự phục hồi

### 2.3. Cân Bằng Tải & Concurrency
- Kiểm soát hạn mức luồng đồng thời (Max Concurrency Slots) cho từng node
- Điều phối tác vụ theo giải thuật Fair-Share FIFO

---

## 3. Khối Trí Tuệ Nhân Tạo (AI Intelligence Engine)
### 3.1. AI Prompt-to-DAG Generator
- Phân tích yêu cầu quy trình nghiệp vụ bằng ngôn ngữ tự nhiên (Tiếng Việt / Anh)
- Tự động suy luận cấu trúc các bước và quan hệ phụ thuộc dependsOn
- Gán hàng đợi chuyên biệt và timeout tương ứng cho từng step
- Tích hợp thư viện gợi ý prompt mẫu (ETL Pipeline, Saga Payment, AI Indexing)

### 3.2. AI Failure Diagnostics & Self-Healing
- Phân tích log lỗi, mã trạng thái và dấu vết thực thi (Stack trace)
- Xác định nguyên nhân cốt lõi (Root Cause: Timeout mạng, Worker OOM, lỗi API thứ 3)
- Đánh giá mức độ nghiêm trọng (Severity: HIGH / MEDIUM / LOW)
- Đề xuất khuyến nghị hành động tự phục hồi (Self-Healing Action)

---

## 4. Bảo Mật & Quản Trị Hệ Thống (Security & Governance)
### 4.1. Xác Thực & Phiên Làm Việc (Authentication)
- Băm mật khẩu chuẩn NIST PBKDF2-HMAC-SHA256 với Salt ngẫu nhiên 16 bytes
- Cấp Bearer Token HMAC-SHA256 không trạng thái (Stateless)
- Hỗ trợ 4 tài khoản Demo một chạm (Admin, Operator, Dev, Viewer)

### 4.2. Phân Quyền Vai Trò (RBAC Matrix)
- Administrator: Quản trị toàn cụm, người dùng và nhật ký an ninh
- Operations Lead: Kích hoạt quy trình, hủy bỏ lượt chạy và giám sát Worker
- Workflow Developer: Thiết kế định nghĩa DAG và sử dụng AI Copilot
- Platform Observer: Chế độ chỉ đọc, xem dashboard và telemetry

### 4.3. Nhật Ký Kiểm Toán Bất Biến (Audit Trail)
- Lưu vết toàn bộ hành vi nhạy cảm (LOGIN, CREATE, TRIGGER, CANCEL...)
- Bộ lọc đa chiều theo hành động, người thực hiện và mốc thời gian

---

## 5. Bảng Điều Khiển Vận Hành (Developer Console UI)
### 5.1. Hệ Thống Giao Diện Kép (Design System)
- Dark Theme (Nền không gian sâu #0b0f19, độ tương phản cao cho DevOps)
- Light Theme (Nền xám mịn #f8fafc, tối ưu quan sát ban ngày)
- Nút chuyển đổi giao diện mượt mà lưu trạng thái LocalStorage

### 5.2. Màn Hình & Trải Nghiệm Người Dùng
- Dashboard: 4 thẻ KPI động, Cluster Telemetry và mục kích hoạt nhanh
- Workflow Definitions: Trực quan hóa Visual Mini-Pipeline và modal cấu hình DAG
- Executions: Thanh lọc trạng thái, Step Timeline dọc và bảng phân tích lỗi AI
- Workers & Queues: Thước đo tải trọng cụm và bảng giám sát 5 hàng đợi
- User & Profile: Danh sách tài khoản RBAC và ma trận quyền hạn cá nhân

---

## 6. Hạ Tầng & Triển Khai (Infrastructure & DevOps)
### 6.1. Cơ Sở Dữ Liệu Kép (Dual Database Strategy)
- SQLite nội bộ: Nhanh gọn, không cần cài đặt, dùng mặc định khi dev/test
- PostgreSQL (Docker Compose): Sẵn sàng cho môi trường production tải cao
- Script tự động hóa khởi tạo schema và seed dữ liệu mẫu (init_db.py)

### 6.2. Kiểm Thử Tự Động Toàn Diện (Automated Test Suite)
- Backend: 16 bài kiểm thử Pytest (DAG engine, worker polling, AI service, API)
- Frontend: 22 bài kiểm thử Vitest (API client, HTTP helpers, custom hooks)
- Script hợp nhất ./run.sh (backend, frontend, test, db)
