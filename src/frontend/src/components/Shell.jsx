import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { I } from "../lib/icons";
import { initials, roleUi } from "../lib/format";
import { useFinance } from "../lib/store";
import { BrandLogo } from "./BrandLogo";

const NAV_GROUPS = [
  {
    label: "ORCHESTRATION",
    items: [
      { to: "/dashboard", label: "Tổng quan", perm: "dashboard", icon: "layout-dashboard", badge: null },
      { to: "/workflows", label: "Quy trình (DAG)", perm: "workflowRead", icon: "git-fork", badge: null },
      { to: "/executions", label: "Lượt chạy (Runs)", perm: "executionRead", icon: "play-circle", badge: "LIVE" },
      { to: "/workers", label: "Workers & Queues", perm: "workerRead", icon: "server", badge: null },
    ],
  },
  {
    label: "QUẢN TRỊ HỆ THỐNG",
    items: [
      { to: "/audit", label: "Nhật ký kiểm toán", perm: "auditRead", icon: "history", badge: null },
      { to: "/users", label: "Người dùng & RBAC", perm: "userManagement", icon: "users", badge: null },
      { to: "/profile", label: "Cài đặt & Hồ sơ", perm: "dashboard", icon: "user-cog", badge: null },
    ],
  },
];

export default function Shell() {
  const { current, can, logout, confirm, setConfirm, metrics } = useFinance();
  const nav = useNavigate();
  const location = useLocation();
  const [dd, setDd] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem("orch_theme") === "dark" ||
      (!localStorage.getItem("orch_theme") && window.matchMedia("(prefers-color-scheme: dark)").matches);
  });
  const displayName = current?.name || current?.fullName || "User";
  const mark = initials(displayName);

  const PAGE_METAS = {
    "/dashboard": { breadcrumb: "Tổng quan", desc: "Giám sát hiệu năng thời gian thực & phân tích cụm Orchestrator", icon: "layout-dashboard" },
    "/workflows": { breadcrumb: "Định nghĩa Quy trình (DAG)", desc: "Trực quan hóa đồ thị tuần tự có hướng, dependency & AI generator", icon: "git-fork" },
    "/executions": { breadcrumb: "Lượt chạy Phân tán (Runs)", desc: "Theo dõi tiến trình step-by-step, log worker & AI self-healing diagnostics", icon: "play-circle" },
    "/workers": { breadcrumb: "Workers & Task Queues", desc: "Quản lý các node xử lý phân tán, tải slot concurrency & queue routing", icon: "server" },
    "/audit": { breadcrumb: "Nhật ký kiểm toán (Audit Trail)", desc: "Dấu vết bất biến và phân tích hành vi người dùng trong cụm", icon: "history" },
    "/users": { breadcrumb: "Người dùng & Phân quyền", desc: "Quản trị danh tính, phân vai trò Role-Based Access Control (RBAC)", icon: "users" },
    "/profile": { breadcrumb: "Hồ sơ & Bảo mật", desc: "Cấu hình tài khoản cá nhân, đổi mật khẩu & ma trận quyền hạn", icon: "user-cog" },
  };

  const pageMeta = PAGE_METAS[location.pathname] || {
    breadcrumb: "Hệ thống Orchestrator",
    desc: "Distributed Workflow Orchestration Platform",
    icon: "layers",
  };

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    document.body.classList.toggle("theme-dark", darkMode);
    localStorage.setItem("orch_theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  useEffect(() => {
    const close = () => setDd(false);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, []);

  const go = (path) => {
    setDd(false);
    nav(path);
  };

  return (
    <div className="orch-app-shell">
      {/* Sidebar Navigation */}
      <aside className="orch-sidebar">
        <div className="orch-sidebar-header">
          <BrandLogo showSub={true} subText="Cluster Orchestrator" />
        </div>

        <nav className="orch-nav">
          {NAV_GROUPS.map((grp) => {
            const visible = grp.items.filter((it) => !it.perm || can(it.perm));
            if (!visible.length) return null;
            return (
              <div key={grp.label} className="orch-nav-group">
                <div className="orch-nav-heading">{grp.label}</div>
                {visible.map((it) => (
                  <NavLink
                    key={it.to}
                    to={it.to}
                    className={({ isActive }) => `orch-nav-item${isActive ? " active" : ""}`}
                  >
                    <span className="orch-nav-icon"><I name={it.icon} size={18} /></span>
                    <span className="orch-nav-label">{it.label}</span>
                    {it.badge && <span className="orch-nav-badge">{it.badge}</span>}
                  </NavLink>
                ))}
              </div>
            );
          })}
        </nav>

        {/* Sidebar Cluster Health Footer */}
        <div className="orch-sidebar-footer">
          <div className="orch-cluster-status-box">
            <div className="orch-cluster-status-dot pulse" />
            <div className="orch-cluster-status-text">
              <span className="orch-cluster-title">Cụm Phân Tán</span>
              <span className="orch-cluster-sub">{metrics?.activeWorkers ?? 3} Workers Online</span>
            </div>
            <span className="orch-cluster-badge">v1.2</span>
          </div>

          <div className="orch-user-card-wrap">
            <button
              type="button"
              className="orch-user-card"
              onClick={(e) => {
                e.stopPropagation();
                setDd((v) => !v);
              }}
            >
              <div className="orch-avatar">{mark}</div>
              <div className="orch-user-info">
                <div className="orch-user-name">{displayName}</div>
                <div className="orch-user-role">{roleUi(current?.role)}</div>
              </div>
              <I name="more-vertical" size={16} className="orch-user-menu-icon" />
            </button>

            {dd && (
              <div className="orch-user-dropdown" onClick={(e) => e.stopPropagation()}>
                <div className="orch-dropdown-header">
                  <div className="orch-dropdown-name">{displayName}</div>
                  <div className="orch-dropdown-email">{current?.email}</div>
                  <span className="orch-role-pill">{roleUi(current?.role)}</span>
                </div>
                <div className="orch-dropdown-divider" />
                <button type="button" onClick={() => go("/profile")} className="orch-dropdown-item">
                  <I name="user" size={15} /> <span>Hồ sơ cá nhân</span>
                </button>
                <button type="button" onClick={() => go("/audit")} className="orch-dropdown-item">
                  <I name="history" size={15} /> <span>Lịch sử kiểm toán</span>
                </button>
                <div className="orch-dropdown-divider" />
                <button type="button" className="orch-dropdown-item danger" onClick={logout}>
                  <I name="log-out" size={15} /> <span>Đăng xuất</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Workspace Content */}
      <div className="orch-main">
        {/* Modern Topbar */}
        <header className="orch-topbar">
          <div className="orch-topbar-left">
            <div className="orch-topbar-icon-wrap">
              <I name={pageMeta.icon} size={20} />
            </div>
            <div>
              <h1 className="orch-topbar-title">{pageMeta.breadcrumb}</h1>
              <p className="orch-topbar-desc">{pageMeta.desc}</p>
            </div>
          </div>

          <div className="orch-topbar-right">
            {/* Live Status indicator */}
            <div className="orch-status-pill">
              <span className="orch-status-indicator" />
              <span className="orch-status-label">Master Node: Ready</span>
            </div>

            {/* Dark / Light toggle */}
            <button
              type="button"
              className="orch-icon-btn"
              aria-label={darkMode ? "Giao diện sáng" : "Giao diện tối"}
              title={darkMode ? "Giao diện sáng" : "Giao diện tối"}
              onClick={() => setDarkMode((v) => !v)}
            >
              <I name={darkMode ? "sun" : "moon"} size={17} />
            </button>

            {/* Profile quick button */}
            <button
              type="button"
              className="orch-topbar-avatar"
              title={displayName}
              onClick={() => go("/profile")}
            >
              {mark}
            </button>
          </div>
        </header>

        {/* Dynamic Page Container */}
        <main className="orch-page-container">
          <Outlet />
        </main>
      </div>

      {/* Confirmation Modal */}
      {confirm && (
        <div className="orch-modal-backdrop" onClick={() => setConfirm(null)}>
          <div className="orch-modal orch-modal-confirm" onClick={(e) => e.stopPropagation()}>
            <div className="orch-modal-confirm-icon">
              <I name="triangle-alert" size={28} />
            </div>
            <h3 className="orch-modal-title">Xác nhận thao tác</h3>
            <p className="orch-modal-body">{confirm?.text}</p>
            <div className="orch-modal-actions">
              <button className="orch-btn orch-btn-secondary" type="button" onClick={() => setConfirm(null)}>
                Hủy bỏ
              </button>
              <button
                className="orch-btn orch-btn-danger"
                type="button"
                onClick={() => {
                  const fn = confirm?.onOk;
                  setConfirm(null);
                  fn?.();
                }}
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
