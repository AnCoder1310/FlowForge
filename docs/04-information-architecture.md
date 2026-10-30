# Information Architecture & Relume Sitemap — FlowForge DWOP

Tài liệu kiến trúc thông tin (Information Architecture), sơ đồ điều hướng phân cấp (Sitemap), và đặc tả wireframe component theo chuẩn Relume cho nền tảng **FlowForge — Distributed Workflow Orchestration Platform**.

---

## 1. Sơ Đồ Điều Hướng Phân Cấp (Navigation Hierarchy)

```text
Public Layer
└── /login (Xác thực tài khoản, Bearer Token HMAC-SHA256 & 4 tài khoản Demo một chạm)

Authenticated Workspace (Shell Layout: Sidebar cố định 260px + Header sticky 68px)
├── [ORCHESTRATION ENGINE]
│   ├── /dashboard          - Giám sát Telemetry, cụm chỉ số KPI & Kích hoạt nhanh
│   ├── /workflows          - Danh mục DAG, Visual Mini-Pipeline & AI Prompt-to-DAG Copilot
│   │   └── /workflows/studio - Visual DAG Builder Studio (Drag-and-Drop & Visual Canvas)
│   ├── /executions         - Quản trị lượt chạy, Timeline từng bước, Trạng thái SKIPPED & AI Self-Healing
│   └── /workers            - Cụm Worker Nodes, Concurrency Slots & 5 Hàng đợi Phân tán
│
├── [GOVERNANCE & ADMIN]
│   ├── /audit              - Nhật ký kiểm toán bảo mật bất biến (Security Audit Trail)
│   ├── /users              - Danh bạ tài khoản & Ma trận phân quyền 4 vai trò RBAC
│   └── /profile            - Hồ sơ kỹ sư, Đổi mật khẩu & Thanh tra quyền hạn
│
└── [SYSTEM EXCEPTION]
    └── /403                - Màn hình từ chối truy cập (Access Denied / Forbidden)
```

---

## 2. Relume Sitemap & Đặc Tả Cấu Trúc Giao Diện (Screen Component Specifications)

### 2.1. Public: Màn hình Đăng Nhập (`/login`)
* **Role Truy Cập:** Khách / Chưa đăng nhập (`PUBLIC`)
* **Header / Branding:** Logo FlowForge, phiên bản hệ thống `v2.4-prod`, thông báo hệ sinh thái phân tán.
* **Hero / Form Section:**
  * Ô nhập Email và Mật khẩu (Validation thời gian thực).
  * Nút "Đăng Nhập" (Loading state khi giải mã PBKDF2).
* **Demo One-Click Accounts Section (4 Thẻ Vai Trò):**
  * `Administrator` (`admin@orchestrator.local`) — Quyền tối cao toàn hệ thống.
  * `Operations Lead` (`operator@orchestrator.local`) — Điều phối, hủy chạy & khắc phục sự cố.
  * `Workflow Developer` (`dev@orchestrator.local`) — Thiết kế DAG & AI Copilot.
  * `Platform Observer` (`viewer@orchestrator.local`) — Chỉ xem báo cáo và giám sát.
* **Footer:** Bản quyền, trạng thái kết nối Orchestrator Engine.

---

### 2.2. Shell Layout (Khung Ứng Dụng Chung)
* **Sidebar (260px cố định bên trái):**
  * Brand Header: Logo FlowForge phát sáng, trạng thái Cluster Online.
  * Nav Group 1 (Orchestration): Dashboard, Workflows, Studio, Executions, Workers.
  * Nav Group 2 (Administration): Audit Trail, User Directory, Profile.
  * Quick Worker Heartbeat Telemetry Mini-card (Hiển thị số node Online / Tổng slots).
  * Nút Thu gọn Sidebar.
* **Topbar (68px sticky trên cùng):**
  * Breadcrumb điều hướng phân cấp.
  * Switcher Chế độ sáng/tối (Dark / Light Theme Toggle).
  * Bộ đếm thông báo cảnh báo tức thời (Live Notifications Badge).
  * User Avatar, Tên người dùng, Huy hiệu vai trò (`ADMIN`, `OPERATOR`, `DEVELOPER`, `VIEWER`).
  * Nút Đăng Xuất (Revoke Session).

---

### 2.3. Màn hình Dashboard & Telemetry (`/dashboard`)
* **Page Header:** Tiêu đề "Cluster Telemetry & Performance", nút "Trigger Quick Workflow".
* **KPI Stats Grid (4 Cards Metrics):**
  * *Active Workflows:* Tổng số DAG đang hoạt động (kèm tỷ lệ kích hoạt).
  * *Running Executions:* Số lượt chạy đang thực thi thời gian thực.
  * *Success Rate (SLO):* Tỷ lệ hoàn thành thành công trong 24h qua (%).
  * *Worker Cluster Capacity:* Số worker khả dụng & mức tải slot concurrency.
* **Real-time Queue Depth & Throughput Section:**
  * 5 thanh tiến trình tải cho 5 hàng đợi: `default`, `compute`, `data-io`, `payment`, `ai-agent`.
* **Recent Executions Activity Table:**
  * Bảng 5 lượt chạy gần nhất (Instance ID, Workflow Name, Status Badge, Duration, Triggered By).
* **Quick Trigger Modal (Hộp thoại Kích Hoạt Nhanh):**
  * Chọn workflow từ dropdown, nhập Input JSON payload, nút xác nhận chạy.

---

### 2.4. Màn hình Quản Lý Workflows (`/workflows`)
* **Page Header:** Tiêu đề "Workflow DAG Definitions", thanh tìm kiếm, bộ lọc trạng thái Active/Inactive, nút "AI Prompt-to-DAG", nút "+ Create DAG".
* **Workflow List / Grid Canvas:**
  * Mỗi thẻ Workflow gồm: Tên quy trình, Phiên bản (`v1`, `v2`), Mô tả nghiệp vụ, Số lượng bước (Steps), Ngày cập nhật.
  * *Interactive Visual Mini-Pipeline Preview:* Hiển thị sơ đồ Kahn stages thu nhỏ với mũi tên kết nối trực quan (`step-1` → `step-2` → `step-3`).
  * Thao tác nhanh: Nút "Trigger Run", "Edit Schema", "Clone Workflow", "View Studio".
* **Modal 1: AI Prompt-to-DAG Copilot (9Router AI Assistant):**
  * Ô nhập prompt mô tả nghiệp vụ bằng ngôn ngữ tự nhiên.
  * Gợi ý prompt mẫu (ETL Pipeline, E-commerce Saga, AI Customer Feedback).
  * Khung xem trước (JSON Preview) và sơ đồ trực quan được AI phân rã (Tasks, DependsOn, Queue, Condition).
  * Nút "Apply to Builder" và "Validate DAG".
* **Modal 2: Manual DAG JSON Editor:**
  * Monaco/Ace Code Editor kiểm tra cú pháp JSON, kiểm tra chu trình lặp (Kahn Algorithm Cycle Detection).
* **Modal 3: Trigger Execution Modal:**
  * Trình soạn thảo Input Payload JSON, chọn môi trường thực thi.

---

### 2.5. Màn hình Visual Workflow Studio (`/workflows/studio`)
* **Toolbar Top:** Tên workflow đang biên tập, Nút Lưu (Save DAG), Nút Kiểm tra chu trình (Validate Kahn DAG), Nút Tự động sắp xếp (Auto-layout).
* **Sidebar Trái (Node Library):**
  * `HTTP_TASK` (Gọi API / Webhook).
  * `WORKER_TASK` (Tính toán phân tán / Polars / Spark).
  * `AI_AGENT_TASK` (Suy luận mô hình LLM / Phân tích cảm xúc / Tóm tắt).
  * `NOTIFICATION` (Gửi thông báo / Slack / Email).
* **Center Canvas (Đồ thị trực quan):**
  * Các khối bước kéo thả (Drag-and-Drop Nodes) thể hiện rõ: ID bước, Hàng đợi gán, Thời gian timeout, Điều kiện rẽ nhánh (`condition`).
  * Cạnh nối (Edges / Directed Arrows) thể hiện mối quan hệ phụ thuộc (`dependsOn`).
  * Nhánh rẽ điều kiện (Conditional Split) và Nhánh hội tụ (Join Convergence).
* **Sidebar Phải (Node Property Inspector):**
  * Chỉnh sửa cấu hình bước được chọn: Max Retries, Timeout Seconds, Queue Registry, Expression Condition.

---

### 2.6. Màn hình Lượt Chạy & Tiến Trình Thực Thi (`/executions`)
* **Page Header:** Tiêu đề "Workflow Executions & Task Lifecycle", Bộ lọc trạng thái (`RUNNING`, `COMPLETED`, `FAILED`, `CANCELLED`), Nút Làm mới (Refresh).
* **Executions Master Table:**
  * Cột: ID lượt chạy, Tên Workflow, Phiên bản, Trạng thái (Pill Badge nhấp nháy nếu RUNNING), Thời điểm bắt đầu, Thời lượng chạy, Người kích hoạt, Thao tác.
  * Thao tác: "View Step Trace", "Cancel Run" (Chỉ Admin/Operator), "AI Diagnose" (khi FAILED).
* **Live Step-by-Step Task Lifecycle Drawer / Modal:**
  * *DAG Execution Stages Header:* Trực quan hóa các tầng tô pô (Layers) do thuật toán Kahn phân tích.
  * *Timeline từng bước chi tiết:*
    * Tên bước, Task Type, Hàng đợi xử lý, Worker Node đảm nhận.
    * Trạng thái chi tiết: `SCHEDULED`, `RUNNING`, `COMPLETED`, `SKIPPED` (màu xám ghi rõ lý do điều kiện không thỏa mãn), `FAILED`.
    * Số lần retry (`Attempt X/Y`), Input Payload JSON, Output Payload JSON.
    * Nút "Sao chép Idempotency Key" và "Xem chi tiết lỗi".
* **Modal AI Self-Healing & Failure Diagnostics:**
  * Mở tự động khi bấm chẩn đoán lượt chạy thất bại.
  * Phân tích nguyên nhân gốc rễ (Root Cause Analysis).
  * Đề xuất phương án tự khắc phục (Actionable Remediation Plan).
  * Nút "Retry Failed Steps Only".

---

### 2.7. Màn hình Cụm Workers & Hàng Đợi (`/workers`)
* **Page Header:** Tiêu đề "Distributed Worker Cluster", Chỉ số tổng: Nodes Online, Tổng Concurrency Slots, Hàng đợi đang hoạt động.
* **5 Dedicated Queue Allocation Cards:**
  * `default`: Xử lý HTTP tasks, điều phối webhook, cảnh báo chung.
  * `compute`: Tác vụ tính toán nặng, biến đổi dữ liệu, xác thực logic.
  * `data-io`: Đọc ghi cơ sở dữ liệu, nạp Parquet, lưu trữ kho analytics.
  * `payment`: Tác vụ tài chính, trừ thẻ, kiểm tra kho hàng, thanh toán.
  * `ai-agent`: Tác vụ suy luận LLM, phân loại cảm xúc, sinh tóm tắt điều hành.
* **Worker Nodes Directory Table:**
  * Worker ID (Node Identifier).
  * Hostname & IP máy chủ.
  * Trạng thái kết nối: `ONLINE` (Chấm xanh) / `OFFLINE` (Chấm đỏ).
  * Các hàng đợi được gán (Badges danh sách queues).
  * Concurrency Load (Thanh tiến trình: Đang chiếm dụng / Giới hạn tối đa).
  * Nhiệm vụ đã hoàn thành (Completed Tasks Counter).
  * Tín hiệu nhịp tim gần nhất (Last Heartbeat Timestamp với cảnh báo quá hạn 45s).

---

### 2.8. Màn hình Nhật Ký Kiểm Toán Bất Biến (`/audit`)
* **Page Header:** Tiêu đề "Security & Operational Audit Trail", bộ chọn khoảng thời gian (24h, 7 ngày, 30 ngày), thanh tìm kiếm người thao tác / hành vi, nút Xuất dữ liệu (Export CSV).
* **Audit Event Log Table:**
  * Mã bản ghi (ID duy nhất).
  * Người thực hiện (Actor: Tên người dùng hoặc `ORCHESTRATOR_DAEMON`).
  * Loại hành động (Action: `LOGIN`, `CREATE`, `TRIGGER`, `CANCEL`, `SKIP`, `RETRY`, `FAIL`).
  * Phân hệ tác động (Module: `AUTH`, `WORKFLOW`, `EXECUTION`, `TASK`, `WORKER`).
  * Chi tiết sự kiện (Event Details: ghi nhận rõ task được release, task bị skip điều kiện, hoặc thay đổi quyền).
  * Thời gian ghi nhận (ISO Timestamp UTC).

---

### 2.9. Màn hình Quản Lý Người Dùng & RBAC (`/users`)
* **Page Header:** Tiêu đề "User Directory & Access Control", Nút "+ Add User" (Chỉ Admin).
* **Role Summary Banner:** Tóm tắt 4 cấp độ quyền trong hệ thống (`ADMIN`, `OPERATOR`, `DEVELOPER`, `VIEWER`).
* **User Accounts Table:**
  * Avatar & Họ tên kỹ sư.
  * Địa chỉ Email & Tên đăng nhập.
  * Vai trò gán (Dropdown chuyển đổi vai trò cho Admin).
  * Trạng thái tài khoản (Kích hoạt `ACTIVE` / Tạm khóa `SUSPENDED`).
  * Lần đăng nhập cuối (Last Active).
  * Thao tác: Khóa/Mở khóa, Đặt lại mật khẩu.

---

### 2.10. Màn hình Hồ Sơ Cá Nhân (`/profile`)
* **Profile Overview Card:**
  * Ảnh đại diện, Họ tên, Email, Múi giờ (`Asia/Ho_Chi_Minh`).
  * Vai trò hiện tại kèm Huy hiệu bảo mật.
* **Self-Service Password Change Form:**
  * Mật khẩu hiện tại, Mật khẩu mới, Xác nhận mật khẩu mới.
  * Yêu cầu độ mạnh mật khẩu (Tối thiểu 8 ký tự, có ký tự đặc biệt).
* **Assigned Permissions Inspector Matrix:**
  * Bảng hiển thị danh sách quyền chi tiết được cấp phép tương ứng với vai trò của tài khoản.

---

### 2.11. Màn hình Từ Chối Truy Cập (`/403`)
* **Illustration / Icon:** Biểu tượng khiên bảo mật màu đỏ khóa chặt.
* **Heading & Message:** "403 - Quyền Truy Cập Bị Từ Chối (Access Denied)".
* **Detail Explanation:** Giải thích rõ vai trò hiện tại không đủ thẩm quyền thực hiện thao tác này theo chính sách RBAC.
* **Action Buttons:** Nút "Quay lại Dashboard", Nút "Xem Ma Trận Quyền".

---

## 3. Đặc Tả Trạng Thái Giao Diện (State Design System)

Mọi màn hình trong FlowForge đều tuân thủ 5 trạng thái bắt buộc của Relume Design System:
1. **Loading State:** Khung xương Skeleton tải dữ liệu mượt mà, hiệu ứng sóng chạy (Shimmer animation).
2. **Empty State:** Hình minh họa vector tinh gọn, tiêu đề thân thiện, nút hành động khởi tạo lần đầu (Call to Action).
3. **Error State:** Băng rôn cảnh báo màu hổ phách/đỏ, mô tả chi tiết lỗi từ chuẩn RFC 7807, nút "Thử lại ngay".
4. **Active/Data State:** Hiển thị dữ liệu trực quan với huy hiệu trạng thái có hiệu ứng nhịp đập (Pulsing Green for RUNNING, Indigo for AI).
5. **Success/Feedback State:** Thông báo Toast tự tắt sau 3 giây ở góc màn hình khi hoàn thành các tác vụ điều phối.
