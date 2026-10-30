# Non-Functional Requirements — FlowForge (DWOP) V1

> **Trạng thái thiết kế:** APPROVED V1 BASELINE  
> **Trạng thái thực thi:** HOÀN THIỆN ĐẦY ĐỦ (FastAPI Async + React Vite Console)

Bảng các yêu cầu phi chức năng (NFR) chuẩn hóa cho nền tảng điều phối luồng công việc phân tán FlowForge (DWOP):

| ID | Tiêu chuẩn / Yêu cầu | Mục đích & Ý nghĩa kỹ thuật | Chỉ số đo lường | Phương pháp xác minh | Trạng thái |
|---|---|---|---|---|---|
| **NFR-PERF-001** | API đọc và truy vấn DAG có độ trễ P95 <= 300 ms. | Giữ giao diện bảng điều khiển hiển thị tức thì. | Server response time cho `/api/v1/workflows` và `/api/v1/executions`. | Tải kiểm thử `PERF-READ-001`. | APPROVED / VERIFIED |
| **NFR-PERF-002** | Thao tác kích hoạt lượt chạy (Trigger Run) và DAG validation hoàn thành <= 500 ms. | Kiểm tra chu trình tức thì và lập lịch bước rễ ngay lập tức. | Server response time cho `POST /api/v1/executions/workflows/{id}/trigger`. | Integration test `PERF-TRIGGER-001`. | APPROVED / VERIFIED |
| **NFR-PERF-003** | Worker Polling & Heartbeat có độ trễ P95 <= 100 ms. | Tối ưu hóa chu kỳ kéo việc của hàng trăm worker song song. | Server response time cho `/api/v1/tasks/poll` và worker heartbeat. | Pytest `test_worker_poll_and_complete_task`. | APPROVED / VERIFIED |
| **NFR-CAP-001** | Cụm hỗ trợ đồng thời ít nhất 1.000 workflow instances và 10.000 task executions. | Đáp ứng nhu cầu xử lý batch quy mô vừa và lớn. | Kích thước dữ liệu và kiểm thử cơ sở dữ liệu. | `PERF-CAP-001`. | APPROVED / VERIFIED |
| **NFR-CAP-002** | Hỗ trợ ít nhất 100 worker nodes hoạt động đồng thời trên 5 queues. | Đảm bảo tính mở rộng ngang (horizontal scale). | Mô phỏng polling đồng thời trên 5 queues. | `PERF-CONC-001`. | APPROVED / VERIFIED |
| **NFR-SEC-001** | Token xác thực Stateless Bearer Token sử dụng thuật toán ký HMAC-SHA256. | Đảm bảo an toàn phiên làm việc, không lưu trạng thái session ở server. | Token header & payload validation; hết hạn sau 24h. | Pytest `test_login_success`. | APPROVED / VERIFIED |
| **NFR-SEC-002** | Mật khẩu tài khoản băm bằng PBKDF2-HMAC-SHA256 với muối ngẫu nhiên 16 bytes. | Ngăn chặn tấn công Rainbow Table và rò rỉ dữ liệu. | Kiểm tra hàm băm mật khẩu trong `security.py`. | Unit test mật khẩu. | APPROVED / VERIFIED |
| **NFR-SEC-003** | Phân quyền RBAC (Role-Based Access Control) thực thi tại backend boundary. | Chặn đứng mọi truy cập trái phép dù frontend bị can thiệp. | HTTP 403 Forbidden cho vai trò không đủ thẩm quyền. | Pytest role authorization. | APPROVED / VERIFIED |
| **NFR-SEC-004** | Tuyệt đối không lưu mật khẩu thô, private key hoặc token bí mật vào log / audit trail. | Bảo vệ an toàn thông tin theo chuẩn OWASP Top 10. | Kiểm tra cấu trúc bản ghi `audit_logs`. | `SEC-LOG-001`. | APPROVED / VERIFIED |
| **NFR-REL-001** | Đảm bảo tính chu trình kín (DAG Zero-Cycle) thông qua Kahn's Algorithm trước khi lưu. | Triệt tiêu hoàn toàn nguy cơ deadlock trong hệ thống phân tán. | Kiểm tra phát hiện chu trình trả về lỗi `CYCLE_DETECTED`. | Pytest `test_validate_dag_cycle_raises`. | APPROVED / VERIFIED |
| **NFR-REL-002** | Hỗ trợ cơ chế tự động thử lại (`maxRetries`) và giới hạn thời gian chờ (`timeoutSeconds`). | Ngăn chặn tác vụ treo vô hạn và tăng khả năng phục hồi lỗi mạng tạm thời. | Cấu hình step DAG và kiểm thử state machine. | Pytest worker retry tests. | APPROVED / VERIFIED |
| **NFR-OBS-001** | Định dạng lỗi chuẩn RFC 7807 Problem Details cho toàn bộ phản hồi API. | Chuẩn hóa thông báo lỗi cho client và các dịch vụ tích hợp. | Schema `status`, `title`, `detail`, `errorCode`. | API response structure test. | APPROVED / VERIFIED |
| **NFR-OBS-002** | Tích hợp AI chẩn đoán nguyên nhân lỗi gốc rễ (Root Cause) và giải pháp tự phục hồi. | Giảm thiểu MTTR (Mean Time to Repair) cho đội ngũ vận hành. | Phản hồi từ `POST /api/v1/ai/diagnose-failure`. | Pytest `test_ai_diagnose_failure_timeout`. | APPROVED / VERIFIED |
