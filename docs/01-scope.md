# Scope V1 — Distributed Workflow Orchestration Platform (DWOP)

> **Trạng thái thiết kế:** TARGET V1  
> **Trạng thái thực thi:** HOÀN THIỆN ĐẦY ĐỦ (FastAPI Backend + React Console)

Tên sản phẩm trong giao diện: **FlowForge — Distributed Workflow Orchestration Platform (DWOP)**.

---

## 1. Bài Toán Thực Tiễn (Problem Statement)

Trong các hệ thống phân tán và kiến trúc Microservices hiện đại, một quy trình nghiệp vụ thường kéo dài qua nhiều bước (như trích xuất dữ liệu ETL, gọi API thanh toán đối tác, xử lý tính toán số lớn, nén tệp, huấn luyện mô hình AI và gửi thông báo). 

Nếu các dịch vụ gọi REST API trực tiếp cho nhau:
- **Nguy cơ lỗi dây chuyền (Cascading Failures):** Một bước lỗi sẽ khiến toàn bộ quy trình sập hoặc dữ liệu bị phân mảnh, không có cơ chế rollback hay bù trừ.
- **Nguy cơ bế tắc (Deadlock / Circular Dependencies):** Nếu các bước phụ thuộc lẫn nhau tạo thành chu trình kín, hệ thống sẽ bị treo vĩnh viễn.
- **Thiếu khả năng quan sát (Lack of Observability):** Không biết tiến trình đang chạy đến bước nào, ai nhận việc, tốn bao nhiêu thời gian và nguyên nhân lỗi ở đâu.
- **Nghẽn hàng đợi (Queue Contention):** Tác vụ tính toán nặng làm nghẽn các tác vụ I/O nhanh nếu dùng chung một queue đơn lẻ.

---

## 2. Mục Tiêu Cốt Lõi V1 (Target V1 Goals)

Hệ thống DWOP đóng vai trò **Bộ não điều phối trung tâm (Master Orchestrator)** với các mục tiêu cụ thể:

### 2.1. Đồ thị DAG & Kiểm Tra Chu Trình (Kahn's Algorithm)
- Cho phép người dùng định nghĩa các bước của quy trình dưới dạng **Đồ thị có hướng không chu trình (DAG)**.
- Tự động kiểm tra tính hợp lệ và phát hiện chu trình lặp bằng thuật toán Topological Sort (Kahn's Algorithm) trước khi lưu.
- Hỗ trợ quan hệ phụ thuộc đa luồng (`dependsOn`), tự động kích hoạt bước tiếp theo ngay khi các bước tiền đề hoàn thành.

### 2.2. Máy Trạng Thái Thực Thi (Execution State Machine)
- Quản lý vòng đời chặt chẽ của từng lượt chạy (Instance) và từng bước (Task):
  $$\text{PENDING} \longrightarrow \text{SCHEDULED} \longrightarrow \text{RUNNING} \longrightarrow \begin{cases} \text{COMPLETED} \\ \text{FAILED (Retry if count < max)} \\ \text{CANCELLED} \end{cases}$$
- Hỗ trợ hủy khẩn cấp lượt chạy đang diễn ra (`CANCELLED`).
- Hỗ trợ chính sách thử lại tự động (`maxRetries`) và giới hạn thời gian chờ (`timeoutSeconds`).

### 2.3. Hàng Đợi Tác Vụ Phân Tán (Queue Isolation & Workers)
- Phân tách tải trọng thành **5 hàng đợi chuyên biệt**: `default`, `compute`, `data-io`, `payment`, `ai-agent`.
- Quản lý các Worker Node phân tán qua cơ chế Heartbeat định kỳ.
- Tự động phát hiện Worker bị mất kết nối và thu hồi task để phân phối lại.

### 2.4. Trí Tuệ Nhân Tạo (AI Copilot & Self-Healing)
- **AI Prompt-to-DAG:** Biến mô tả bằng ngôn ngữ tự nhiên thành định nghĩa JSON DAG chuẩn xác chỉ trong vài giây.
- **AI Failure Diagnostics:** Khi task bị lỗi hoặc timeout, AI tự động đọc log, phân tích nguyên nhân gốc rễ (*Root Cause*) và đưa ra giải pháp khắc phục.

### 2.5. Phân Quyền Vai Trò (Role-Based Access Control - RBAC)
- 4 vai trò rõ rệt: `Administrator` (Quản trị cụm), `Operations Lead` (Vận hành & Hủy chạy), `Workflow Developer` (Thiết kế DAG & dùng AI), `Platform Observer` (Chỉ xem).
- Cơ chế ký chữ ký số HMAC-SHA256 Bearer token không trạng thái (stateless).
- Nhật ký kiểm toán bất biến (**Audit Trail**) ghi nhận mọi thao tác nhạy cảm.

### 2.6. Giao Diện Bảng Điều Khiển (Developer Console)
- Bảng điều khiển React SPA hiện đại hỗ trợ **Dark & Light Mode**.
- Trực quan hóa cấu trúc DAG, sơ đồ tiến trình step-by-step theo thời gian thực và telemetry của cụm Worker.
