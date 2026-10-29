# INVEST Requirements — Distributed Workflow Orchestration Platform (DWOP)

> **Trạng thái:** TARGET V1 (Hoàn thành)

Mỗi User Story trong hệ thống DWOP tuân thủ nghiêm ngặt tiêu chuẩn **INVEST**:
- **Independent:** Mỗi tính năng hoạt động độc lập và có thể kiểm thử riêng biệt.
- **Negotiable:** Cho phép điều chỉnh chi tiết UI nhưng giữ vững bản chất điều phối.
- **Valuable:** Đem lại giá trị thiết thực cho kỹ sư vận hành và nhà phát triển.
- **Estimable:** Rõ ràng về đầu vào, đầu ra, vai trò và mã lỗi.
- **Small:** Quy mô vừa đủ cho một chu trình phát triển và kiểm thử tự động.
- **Testable:** Có kịch bản kiểm thử tự động (Pytest / Vitest) tương ứng.

---

## 1. Bảng User Stories Cốt Lõi (Product Backlog)

| ID | User Story | Giá Trị Mang Lại | Vai Trò Cho Phép | Mã AC |
| :--- | :--- | :--- | :--- | :--- |
| **US01** | Xác thực tài khoản và cấp Bearer token an toàn. | Bảo vệ quyền truy cập | Mọi vai trò | AC-UC01 |
| **US02** | Xem tổng quan Dashboard (DAGs, Running, Workers, Success Rate). | Giám sát toàn cục | Mọi vai trò | AC-UC02 |
| **US03** | Định nghĩa Workflow DAG và tự động phát hiện chu trình (Kahn). | Ngăn chặn Deadlock | Developer, Admin | AC-UC03 |
| **US04** | Dùng AI sinh đồ thị DAG từ ngôn ngữ tự nhiên (Prompt-to-DAG). | Tăng tốc thiết kế 10x | Developer, Admin | AC-UC04 |
| **US05** | Kích hoạt Workflow Run mới với Input Payload JSON. | Khởi chạy tiến trình | Operator, Admin | AC-UC05 |
| **US06** | Theo dõi tiến trình Step-by-Step theo thời gian thực. | Quan sát trạng thái | Mọi vai trò | AC-UC06 |
| **US07** | Hủy bỏ lượt chạy đang diễn ra (Cancel Run). | Kiểm soát sự cố | Operator, Admin | AC-UC07 |
| **US08** | Dùng AI chẩn đoán nguyên nhân sự cố và đề xuất Self-Healing. | Tự phục hồi lỗi | Operator, Dev, Admin | AC-UC08 |
| **US09** | Giám sát Worker Nodes, mức tải slot concurrency và Heartbeat. | Quản lý hạ tầng | Mọi vai trò | AC-UC09 |
| **US10** | Điều phối tác vụ theo 5 hàng đợi độc lập (Queue Isolation). | Tránh nghẽn tài nguyên | Mọi vai trò | AC-UC10 |
| **US11** | Kiểm tra nhật ký kiểm toán bất biến (Audit Trail). | An toàn & Truy vết | Admin, Operator | AC-UC11 |
| **US12** | Quản lý tài khoản người dùng và ma trận phân quyền (RBAC). | Quản trị định danh | Admin | AC-UC12 |
| **US13** | Tự đổi mật khẩu và xem quyền hạn cá nhân (Self-Service). | Quản lý cá nhân | Mọi vai trò | AC-UC13 |
