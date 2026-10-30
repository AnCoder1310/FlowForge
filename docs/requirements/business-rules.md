# Business Rules — FlowForge (DWOP) V1

> **Trạng thái thiết kế:** TARGET V1  
> **Trạng thái thực thi:** HOÀN THIỆN ĐẦY ĐỦ (FastAPI Backend + React Console)

Các quy tắc nghiệp vụ (Business Rules) dưới đây xác định các điều kiện bắt buộc và ràng buộc logic của nền tảng điều phối luồng công việc phân tán FlowForge (DWOP).

---

## BR-001 — Hệ Thống Vai Trò (Roles & RBAC)

- **Nguồn:** `docs/03-use-cases.md`, `docs/08-invest-requirements.md` (US01, US12)
- **APIs liên quan:** Mọi endpoint bảo vệ (`/api/v1/...`)
- **Quy tắc:** Hệ thống quản lý chặt chẽ 4 vai trò duy nhất:
  1. `ADMIN` (Administrator): Toàn quyền quản trị người dùng, cấu hình cụm, xem audit trail và điều phối.
  2. `OPERATOR` (Operations Lead): Kích hoạt workflow, hủy lượt chạy khẩn cấp, giám sát worker và chạy AI chẩn đoán lỗi.
  3. `DEVELOPER` (Workflow Developer): Thiết kế đồ thị DAG, kích hoạt test run, sử dụng tính năng AI Prompt-to-DAG.
  4. `VIEWER` (Platform Observer): Chỉ có quyền đọc (Read-only) telemetry cụm, lịch sử chạy và trạng thái worker.

---

## BR-002 — Tính Hợp Lệ Của Đồ Thị DAG & Kiểm Tra Chu Trình (Kahn's Algorithm)

- **Nguồn:** `docs/01-scope.md`, `docs/08-invest-requirements.md` (US04)
- **APIs liên quan:** `POST /api/v1/workflows`
- **Quy tắc:**
  - Mỗi workflow phải có ít nhất 1 step hợp lệ.
  - Mỗi step phải có `id` duy nhất trong cùng một workflow.
  - Các phần tử trong danh sách phụ thuộc (`dependsOn`) phải trỏ tới `id` của step tồn tại trong cùng workflow.
  - Step không được phép tự phụ thuộc vào chính nó (`step.id != dep`).
  - Hệ thống áp dụng thuật toán sắp xếp tô-pô **Kahn's Algorithm**. Nếu phát hiện chu trình kín (chu trình lặp gây deadlock), hệ thống từ chối lưu và trả về mã lỗi `400 Bad Request` kèm mã lỗi `CYCLE_DETECTED`.

---

## BR-003 — Máy Trạng Thái Thực Thi (Execution State Machine)

- **Nguồn:** `docs/01-scope.md`, `docs/08-invest-requirements.md` (US06, US07, US08)
- **APIs liên quan:** `POST /api/v1/executions/workflows/{id}/trigger`, `POST /api/v1/executions/{id}/cancel`
- **Quy tắc:**
  - Vòng đời của một Execution Instance:
    `PENDING` -> `RUNNING` -> `COMPLETED` / `FAILED` / `CANCELLED`
  - Vòng đời của một Task Execution (Step):
    `PENDING` -> `SCHEDULED` -> `RUNNING` -> `COMPLETED` / `FAILED` / `CANCELLED` / `TIMED_OUT`
  - Trạng thái instance chỉ chuyển sang `COMPLETED` khi tất cả các bước con đều hoàn thành thành công (`COMPLETED`).
  - Nếu bất kỳ bước nào bị `FAILED` và vượt quá số lần retry cho phép (`maxRetries`), instance sẽ chuyển sang trạng thái `FAILED`.

---

## BR-004 — Tự Động Giải Phóng Bước Kế Tiếp (Step Dependency Resolution)

- **Nguồn:** `docs/01-scope.md`, `docs/08-invest-requirements.md` (US07)
- **APIs liên quan:** `POST /api/v1/tasks/{task_id}/complete`
- **Quy tắc:**
  - Khi một task hoàn tất (`COMPLETED`), DAG Engine tự động quét đồ thị để tìm các task kế tiếp.
  - Một task chỉ được chuyển từ `PENDING` sang `SCHEDULED` và đưa vào hàng đợi tương ứng khi **TẤT CẢ** các task tiền đề (`dependsOn`) của nó đã đạt trạng thái `COMPLETED`.

---

## BR-005 — Quyền Hạn Hủy Bỏ Khẩn Cấp (Emergency Cancellation)

- **Nguồn:** `docs/03-use-cases.md` (UC06), `docs/08-invest-requirements.md` (US08)
- **APIs liên quan:** `POST /api/v1/executions/{id}/cancel`
- **Quy tắc:**
  - Chỉ có `ADMIN` và `OPERATOR` mới có quyền gửi lệnh hủy lượt chạy.
  - Khi hủy instance, mọi task con đang ở trạng thái `SCHEDULED` hoặc `RUNNING` sẽ lập tức bị hủy bỏ (`CANCELLED`), đồng thời giải phóng worker slot đang xử lý tác vụ đó.

---

## BR-006 — Cô Lập Hàng Đợi Tác Vụ (Queue Isolation)

- **Nguồn:** `docs/01-scope.md`, `docs/08-invest-requirements.md` (US10)
- **APIs liên quan:** `POST /api/v1/tasks/poll`
- **Quy tắc:**
  - Hệ thống hỗ trợ 5 hàng đợi độc lập: `default`, `compute`, `data-io`, `payment`, `ai-agent`.
  - Mỗi step được chỉ định 1 hàng đợi cụ thể.
  - Worker node khi gửi request poll task chỉ được kéo các task thuộc các queue mà nó đã đăng ký hỗ trợ (`supported_queues`).

---

## BR-007 — Nhịp Tim Sống Worker (Worker Heartbeat & Health Check)

- **Nguồn:** `docs/01-scope.md`, `docs/08-invest-requirements.md` (US10)
- **APIs liên quan:** `POST /api/v1/workers/{worker_id}/heartbeat`, `GET /api/v1/workers`
- **Quy tắc:**
  - Mỗi Worker định kỳ gửi heartbeat (mặc định mỗi 10-30 giây).
  - Nếu một Worker không gửi heartbeat quá 60 giây, trạng thái sẽ tự động chuyển thành `OFFLINE`.
  - Các tác vụ đang bị gán cho Worker offline sẽ được đánh dấu để tái điều phối (re-dispatch) sang Worker khác khả dụng.

---

## BR-008 — Nhật Ký Kiểm Toán Bất Biến (Immutable Audit Trail)

- **Nguồn:** `docs/03-use-cases.md` (UC10), `docs/08-invest-requirements.md` (US11)
- **APIs liên quan:** `GET /api/v1/audit`
- **Quy tắc:**
  - Mọi thao tác nhạy cảm: Đăng nhập (`LOGIN`), Đăng xuất (`LOGOUT`), Tạo quy trình (`CREATE_WORKFLOW`), Kích hoạt thực thi (`TRIGGER_RUN`), Hủy lượt chạy (`CANCEL_RUN`), Thay đổi người dùng (`UPDATE_USER`) bắt buộc phải ghi lại nhật ký kiểm toán.
  - Dữ liệu audit là bất biến (append-only), không cho phép chỉnh sửa hoặc xóa qua API.
  - Tuyệt đối không lưu mật khẩu thô, token bí mật hoặc signing keys vào log audit.

---

## BR-009 — Trí Tuệ Nhân Tạo Hỗ Trợ (AI Prompt-to-DAG & Self-Healing)

- **Nguồn:** `docs/01-scope.md`, `docs/08-invest-requirements.md` (US05, US09)
- **APIs liên quan:** `POST /api/v1/ai/generate-workflow`, `POST /api/v1/ai/diagnose-failure`
- **Quy tắc:**
  - AI Prompt-to-DAG phải sinh cấu trúc đồ thị thỏa mãn định dạng `DagDefinition` và vượt qua bài kiểm tra chu trình của Kahn's algorithm trước khi trả về cho người dùng.
  - AI Failure Diagnosis chỉ được kích hoạt đối với các task hoặc instance có trạng thái lỗi (`FAILED` hoặc `TIMED_OUT`), trích xuất log lỗi và đưa ra phân tích nguyên nhân gốc rễ (Root Cause) cùng khuyến nghị tự phục hồi (Self-Healing).
