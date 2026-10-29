# Database Schema & Initialization — DWOP

Hệ thống hỗ trợ song song hai loại cơ sở dữ liệu:
1. **SQLite (Mặc định trong môi trường cục bộ):** `src/database/workflow_orchestrator.db`
2. **PostgreSQL (Sẵn sàng trong môi trường Docker Compose):** `src/database/workflow_orchestrator.sql`

---

## 1. Danh Sách Các Bảng Cốt Lõi

1. **`app_users`**: Lưu trữ tài khoản và vai trò RBAC (`ADMIN`, `OPERATOR`, `DEVELOPER`, `VIEWER`). Mật khẩu băm PBKDF2-HMAC-SHA256 với salt ngẫu nhiên 16 bytes.
2. **`workflow_definitions`**: Lưu trữ bản thiết kế DAG (`dag_schema` dạng JSON chứa danh sách steps, dependencies, queue, retry policy).
3. **`workflow_instances`**: Lưu trữ từng phiên thực thi cụ thể của một workflow kèm trạng thái (`PENDING`, `RUNNING`, `COMPLETED`, `FAILED`, `CANCELLED`).
4. **`task_executions`**: Lưu trữ từng bước chạy chi tiết trong một instance, gán worker node nào nhận và số lần retry.
5. **`worker_nodes`**: Lưu trữ danh sách các node máy chủ thực thi phân tán, slot concurrency tối đa, tải hiện tại và heartbeat timestamp.
6. **`audit_logs`**: Nhật ký lưu vết an ninh bất biến, ghi nhận mọi hành vi người dùng trong hệ thống.

---

## 2. Lệnh Khởi Tạo & Nạp Dữ Liệu Mẫu

Để khởi tạo lại toàn bộ database và nạp sẵn tài khoản / workflow mẫu:
```bash
./run.sh db
```
Hoặc chạy trực tiếp qua Python:
```bash
python3 src/database/init_db.py
```
