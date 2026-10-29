# Distributed Workflow Orchestration Platform — API Documentation

> **Base URL:** `/api/v1`  
> **Backend Host:** `http://127.0.0.1:8000`  
> **Interactive Swagger UI:** `http://127.0.0.1:8000/docs`  
> **ReDoc UI:** `http://127.0.0.1:8000/redoc`  

---

## 1. Tổng Quan API Endpoints

Hệ thống cung cấp đầy đủ các nhóm endpoint phục vụ điều phối phân tán:

### 1.1. Xác thực (Authentication)
* `POST /api/v1/auth/login`: Xác thực Email/Password, trả về Bearer Token HMAC-SHA256.
* `POST /api/v1/auth/logout`: Hủy phiên làm việc phía client và ghi nhận audit.

### 1.2. Định nghĩa Quy trình (Workflows)
* `GET /api/v1/workflows`: Lấy danh sách các workflow DAG đang kích hoạt.
* `POST /api/v1/workflows`: Tạo mới và biên dịch workflow DAG (tự động kiểm tra chu trình bằng thuật toán Kahn).
* `GET /api/v1/workflows/{id}`: Xem chi tiết cấu trúc DAG và các bước phụ thuộc.

### 1.3. Lượt chạy Phân tán (Executions)
* `GET /api/v1/executions`: Lấy danh sách lịch sử thực thi và trạng thái step.
* `POST /api/v1/executions/workflows/{id}/trigger`: Kích hoạt một lượt chạy DAG với Input Payload JSON.
* `GET /api/v1/executions/{id}`: Xem chi tiết tiến trình từng step, assigned worker và thời gian.
* `POST /api/v1/executions/{id}/cancel`: Hủy bỏ khẩn cấp lượt chạy đang diễn ra.

### 1.4. Trí Tuệ Nhân Tạo (AI Engine)
* `POST /api/v1/ai/generate-workflow`: Tự động sinh đồ thị DAG JSON hoàn chỉnh từ câu prompt tự nhiên.
* `POST /api/v1/ai/diagnose-failure`: Chẩn đoán nguyên nhân gốc rễ và đề xuất hành động tự phục hồi (Self-Healing) khi task bị lỗi.

### 1.5. Cụm Worker Nodes (Distributed Workers)
* `GET /api/v1/workers`: Danh sách các node worker trong cụm và mức chiếm dụng slot concurrency.
* `POST /api/v1/workers/{worker_id}/heartbeat`: Cập nhật tín hiệu sống của Worker Node.
* `POST /api/v1/workers/{worker_id}/poll`: Worker kéo (poll) task sẵn sàng trong queue được gán.
* `POST /api/v1/workers/{worker_id}/complete-task`: Worker báo cáo hoàn thành hoặc thất bại task.

### 1.6. Kiểm toán & Người dùng (Audit & Users)
* `GET /api/v1/audit-logs`: Nhật ký kiểm toán bất biến (hỗ trợ lọc theo hành động, thời gian).
* `GET /api/v1/users`: Danh sách tài khoản người dùng và vai trò RBAC.
* `GET /api/v1/metrics/dashboard`: Chỉ số tổng quan cụm Orchestrator.

---

## 2. Chuẩn Lỗi (RFC 7807 Problem Details)

Mọi phản hồi lỗi từ API đều tuân thủ định dạng chuẩn RFC 7807:
```json
{
  "status": 400,
  "title": "Bad Request",
  "detail": "Workflow DAG contains a cycle. Deadlock detected.",
  "errorCode": "CYCLE_DETECTED"
}
```
