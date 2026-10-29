# Acceptance Criteria — Distributed Workflow Orchestration Platform

Tiêu chí chấp nhận kỹ thuật cho các chức năng cốt lõi của hệ thống DWOP.

---

### AC-UC01: Xác thực & Quản lý Phiên (Authentication)
* **Given** Email và mật khẩu đúng (`admin@orchestrator.local` / `ChangeMe123!`),
* **When** Gọi POST `/api/v1/auth/login`,
* **Then** Hệ thống trả về mã HTTP `200 OK`, kèm token Bearer HMAC-SHA256 và thông tin an toàn của user (không lộ password hash).
* **When** Nhập sai mật khẩu, hệ thống trả về mã `401 Unauthorized` với thông điệp an toàn.

### AC-UC03: Kiểm Tra Chu Trình DAG (Kahn's Algorithm)
* **Given** Một DAG có các step phụ thuộc vòng tròn (Step A phụ thuộc Step B, Step B phụ thuộc Step A),
* **When** Gọi POST `/api/v1/workflows` để lưu,
* **Then** Hệ thống phát hiện chu trình lặp bằng thuật toán Kahn, từ chối lưu và trả về `400 Bad Request` kèm thông báo: *"Workflow DAG contains a cycle. Deadlock detected."*

### AC-UC04: AI Prompt-to-DAG Generator
* **Given** Một câu prompt văn bản tự nhiên mô tả nghiệp vụ (ví dụ ETL pipeline),
* **When** Gọi POST `/api/v1/ai/generate-workflow`,
* **Then** AI trả về cấu trúc DAG hợp lệ gồm tên, mô tả, các steps có gán queue phù hợp (`compute`, `data-io`...) và thời gian timeout.

### AC-UC05: Kích hoạt Lượt Chạy (Trigger Run)
* **Given** Một Workflow ID hợp lệ và Input Payload JSON,
* **When** Gọi POST `/api/v1/executions/workflows/{id}/trigger`,
* **Then** Hệ thống tạo bản ghi `workflow_instances` với trạng thái `RUNNING`.
* **And** Bước gốc (Root step không có dependency) lập tức chuyển sang trạng thái `SCHEDULED` sẵn sàng cho worker gắp.

### AC-UC08: AI Chẩn Đoán Lỗi (Self-Healing)
* **Given** Một lượt chạy bị trạng thái `FAILED`,
* **When** Gọi POST `/api/v1/ai/diagnose-failure`,
* **Then** Hệ thống trả về `rootCause`, `severity` và khuyến nghị `suggestedFix` chi tiết.
