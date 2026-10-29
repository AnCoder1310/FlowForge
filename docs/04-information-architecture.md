# Information Architecture — Distributed Workflow Orchestration Console

Tài liệu kiến trúc thông tin, cấu trúc điều hướng và hệ thống màn hình của bảng điều khiển kỹ sư vận hành.

---

## 1. Bản Đồ Điều Hướng (Navigation Hierarchy)

```text
/login (Xác thực tài khoản & Tài khoản demo một chạm)
  │
  └── Shell Layout (Sidebar cố định 260px + Topbar sticky 68px + Workspace)
        │
        ├── [ORCHESTRATION]
        │     ├── /dashboard    - Tổng quan hiệu năng & Telemetry cụm
        │     ├── /workflows    - Định nghĩa DAG, visual mini-pipeline & AI Prompt-to-DAG
        │     ├── /executions   - Theo dõi tiến trình các lượt chạy, timeline step & AI Fix
        │     └── /workers      - Quản lý Worker Nodes, slot concurrency & 5 Task Queues
        │
        └── [QUẢN TRỊ HỆ THỐNG]
              ├── /audit        - Nhật ký kiểm toán bất biến & bộ lọc thời gian
              ├── /users        - Quản lý thành viên & 4 vai trò RBAC
              └── /profile      - Hồ sơ cá nhân, đổi mật khẩu & ma trận quyền hạn
```

---


## 1.1 Sơ Đồ Kiến Trúc Thông Tin & Sitemap (Relume)

![Relume Sitemap](images/admin/sitemap.png)

## 2. Đặc Tả Giao Diện & Trải Nghiệm (Design System)

* **Chế độ hiển thị kép (Dark / Light Theme):**
  * *Dark Mode (Mặc định):* Nền không gian sâu `#0b0f19`, card `#0f172a`, viền `#334155` tương phản cao, tối ưu cho kỹ sư vận hành DevOps.
  * *Light Mode:* Nền xám mịn `#f8fafc`, card trắng tinh gọn `#ffffff` viền `#e2e8f0`.
* **Trực quan hóa đồ thị (Visual DAG Mini-Pipeline):**
  * Các bước được nối tiếp bằng mũi tên chỉ hướng: `step-fetch` → `step-process` → `step-notify`.
  * Huy hiệu trạng thái động: Chấm xanh nhấp nháy (Pulse Animation) cho các bước đang chạy (`RUNNING`).
* **Hộp thoại AI Copilot:**
  * Khung phát sáng gradient tím-hồng cho tính năng Prompt-to-DAG và Self-Healing.
