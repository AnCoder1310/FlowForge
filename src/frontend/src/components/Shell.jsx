import { useEffect, useState, useMemo } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { I } from "../lib/icons";
import { initials, roleUi } from "../lib/format";
import { useOrchestrator } from "../lib/store";
import { BrandLogo } from "./BrandLogo";

const NAV_GROUPS = [
  {
    label: "ORCHESTRATION",
    items: [
      { to: "/dashboard", label: "Tổng quan", perm: "dashboard", icon: "layout-dashboard", badge: null },
      { to: "/workflows", label: "Quy trình (DAG)", perm: "workflowRead", icon: "git-fork", badge: null },
      { to: "/executions", label: "Lượt chạy (Runs)", perm: "executionRead", icon: "play-circle", badge: null },
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

const PAGE_METAS = {
  "/dashboard": {
    breadcrumb: "Tổng quan",
    desc: "Giám sát hiệu năng thời gian thực & phân tích cụm Orchestrator",
    icon: "layout-dashboard",
  },
  "/workflows": {
    breadcrumb: "Định nghĩa Quy trình (DAG)",
    desc: "Trực quan hóa đồ thị tuần tự có hướng, dependency & AI generator",
    icon: "git-fork",
  },
  "/workflows/studio": {
    breadcrumb: "Visual Workflow Studio",
    desc: "Thiết kế trực quan DAG đa nhánh, kéo thả kết nối và AI generator",
    icon: "sparkles",
  },
  "/executions": {
    breadcrumb: "Lượt chạy Phân tán (Runs)",
    desc: "Theo dõi tiến trình step-by-step, log worker & AI self-healing diagnostics",
    icon: "play-circle",
  },
  "/workers": {
    breadcrumb: "Workers & Task Queues",
    desc: "Quản lý các node xử lý phân tán, tải slot concurrency & queue routing",
    icon: "server",
  },
  "/audit": {
    breadcrumb: "Nhật ký kiểm toán (Audit Trail)",
    desc: "Dấu vết bất biến và phân tích hành vi người dùng trong cụm",
    icon: "history",
  },
  "/users": {
    breadcrumb: "Người dùng & Phân quyền",
    desc: "Quản trị danh tính, phân vai trò Role-Based Access Control (RBAC)",
    icon: "users",
  },
  "/profile": {
    breadcrumb: "Hồ sơ & Bảo mật",
    desc: "Cấu hình tài khoản cá nhân, đổi mật khẩu & ma trận quyền hạn",
    icon: "user-cog",
  },
};

export default function Shell() {
  const { current, can, logout, confirm, setConfirm, metrics } = useOrchestrator();
  const nav = useNavigate();
  const location = useLocation();

  const [dd, setDd] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    return (
      localStorage.getItem("orch_theme") === "dark" ||
      (!localStorage.getItem("orch_theme") &&
        window.matchMedia("(prefers-color-scheme: dark)").matches)
    );
  });

  const displayName = current?.name || current?.fullName || "User";
  const mark = initials(displayName);

  const pageMeta = useMemo(() => {
    if (PAGE_METAS[location.pathname]) {
      return PAGE_METAS[location.pathname];
    }
    const matchedPath = Object.keys(PAGE_METAS)
      .filter((p) => location.pathname.startsWith(`${p}/`))
      .sort((a, b) => b.length - a.length)[0];
    return matchedPath
      ? PAGE_METAS[matchedPath]
      : {
          breadcrumb: "Hệ thống Orchestrator",
          desc: "Distributed Workflow Orchestration Platform",
          icon: "layers",
        };
  }, [location.pathname]);

  const isStudio = location.pathname.includes("/studio");
  const isDashPage = ["/dashboard", "/workflows", "/executions", "/audit"].includes(
    location.pathname
  );

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    document.body.classList.toggle("theme-dark", darkMode);
    localStorage.setItem("orch_theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  useEffect(() => {
    const close = () => {
      setDd(false);
    };
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, []);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const go = (path) => {
    setDd(false);
    setMobileMenuOpen(false);
    nav(path);
  };

  return (
    <div className="orch-app-shell">
      <style>{`
        /* =====================================
           SHELL & LAYOUT - DASHBOARD DESIGN SYSTEM
        ===================================== */

        :root {
          --dash-primary: #0891b2;
          --dash-primary-dark: #0e7490;
          --dash-text: #172033;
          --dash-muted: #8490a3;
          --dash-border: #e8edf3;
          --dash-bg: #f6f8fb;
        }

        .orch-app-shell {
          display: flex;
          min-height: 100vh;
          background-color: var(--dash-bg);
          color: var(--dash-text);
        }

        /* SIDEBAR (NAVY HIGH-CONTRAST) */
        .orch-sidebar {
          width: 260px;
          height: 100vh;
          position: fixed;
          top: 0;
          left: 0;
          background-color: #0b0f19;
          border-right: 1px solid rgba(255, 255, 255, 0.08);
          display: flex;
          flex-direction: column;
          z-index: 50;
          overflow-y: auto;
          user-select: none;
          transition: transform 0.25s ease;
        }

        .orch-sidebar-header {
          padding: 20px 18px 16px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }

        .orch-nav {
          flex: 1;
          padding: 18px 12px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .orch-nav-group {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .orch-nav-heading {
          font-size: 10px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 1.2px;
          color: #64748b;
          padding: 4px 10px;
          margin-bottom: 3px;
        }

        .orch-nav-item {
          display: flex;
          align-items: center;
          gap: 11px;
          padding: 9px 12px;
          border-radius: 9px;
          color: #94a3b8;
          font-size: 13px;
          font-weight: 600;
          transition: all 0.16s ease;
          position: relative;
          text-decoration: none;
        }

        .orch-nav-item:hover {
          background-color: rgba(255, 255, 255, 0.05);
          color: #f1f5f9;
        }

        .orch-nav-item.active {
          background: linear-gradient(90deg, rgba(8, 145, 178, 0.20) 0%, rgba(8, 145, 178, 0.03) 100%);
          color: #ffffff;
          font-weight: 700;
          box-shadow: inset 3.5px 0 0 0 #0891b2;
        }

        .orch-nav-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          color: inherit;
          opacity: 0.85;
        }

        .orch-nav-item.active .orch-nav-icon {
          color: #22d3ee;
          opacity: 1;
        }

        .orch-nav-label {
          flex: 1;
        }

        .orch-nav-badge {
          font-size: 10px;
          font-weight: 800;
          padding: 2px 7px;
          border-radius: 99px;
          background-color: #ef4444;
          color: #ffffff;
        }

        /* SIDEBAR FOOTER */
        .orch-sidebar-footer {
          padding: 12px;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          display: flex;
          flex-direction: column;
          gap: 10px;
          background-color: rgba(0, 0, 0, 0.25);
        }

        .orch-cluster-status-box {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 9px 12px;
          background-color: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 9px;
        }

        .orch-cluster-status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background-color: #10b981;
          box-shadow: 0 0 8px #10b981;
          flex-shrink: 0;
        }

        .orch-cluster-status-dot.pulse {
          animation: dash-dot-pulse 2s infinite ease-in-out;
        }

        .orch-cluster-status-text {
          flex: 1;
          display: flex;
          flex-direction: column;
        }

        .orch-cluster-title {
          font-size: 11px;
          font-weight: 750;
          color: #e2e8f0;
        }

        .orch-cluster-sub {
          font-size: 10px;
          color: #10b981;
          font-weight: 600;
        }

        .orch-cluster-badge {
          font-size: 10px;
          color: #64748b;
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
          background: rgba(255, 255, 255, 0.06);
          padding: 2px 5px;
          border-radius: 4px;
        }

        /* USER PROFILE CARD IN SIDEBAR */
        .orch-user-card-wrap {
          position: relative;
        }

        .orch-user-card {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 10px;
          border-radius: 9px;
          border: 0;
          background: transparent;
          color: #e2e8f0;
          transition: background-color 0.15s ease;
          text-align: left;
          cursor: pointer;
        }

        .orch-user-card:hover {
          background-color: rgba(255, 255, 255, 0.06);
        }

        .orch-avatar {
          width: 34px;
          height: 34px;
          border-radius: 9px;
          background: linear-gradient(135deg, #0891b2 0%, #2563eb 100%);
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 800;
          flex-shrink: 0;
          box-shadow: 0 2px 6px rgba(8, 145, 178, 0.35);
        }

        .orch-user-info {
          flex: 1;
          min-width: 0;
        }

        .orch-user-name {
          font-size: 12px;
          font-weight: 750;
          color: #f1f5f9;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .orch-user-role {
          font-size: 10px;
          color: #94a3b8;
        }

        .orch-user-menu-icon {
          color: #64748b;
        }

        .orch-user-dropdown {
          position: absolute;
          bottom: calc(100% + 8px);
          left: 0;
          right: 0;
          background-color: #ffffff;
          border: 1px solid var(--dash-border);
          border-radius: 12px;
          box-shadow: 0 12px 32px rgba(15, 23, 42, 0.15);
          padding: 8px;
          z-index: 100;
        }

        html.dark .orch-user-dropdown {
          background-color: #1e293b;
          border-color: #334155;
          box-shadow: 0 12px 32px rgba(0, 0, 0, 0.4);
        }

        .orch-dropdown-header {
          padding: 8px 10px 10px;
        }

        .orch-dropdown-name {
          font-weight: 750;
          font-size: 13px;
          color: var(--dash-text);
        }

        .orch-dropdown-email {
          font-size: 11px;
          color: var(--dash-muted);
          margin-top: 2px;
        }

        .orch-role-pill {
          display: inline-block;
          margin-top: 6px;
          padding: 2px 7px;
          border-radius: 99px;
          font-size: 10px;
          font-weight: 750;
          background-color: #ecfeff;
          color: #0891b2;
          border: 1px solid #cffafe;
        }

        .orch-dropdown-divider {
          height: 1px;
          background-color: var(--dash-border);
          margin: 6px 0;
        }

        html.dark .orch-dropdown-divider {
          background-color: #334155;
        }

        .orch-dropdown-item {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 9px;
          padding: 8px 10px;
          border-radius: 7px;
          border: 0;
          background: transparent;
          font-size: 12px;
          font-weight: 600;
          color: #475569;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        html.dark .orch-dropdown-item {
          color: #cbd5e1;
        }

        .orch-dropdown-item:hover {
          background-color: #f1f5f9;
          color: #0891b2;
        }

        html.dark .orch-dropdown-item:hover {
          background-color: #334155;
          color: #38bdf8;
        }

        .orch-dropdown-item.danger {
          color: #ef4444;
        }

        .orch-dropdown-item.danger:hover {
          background-color: #fef2f2;
          color: #dc2626;
        }

        html.dark .orch-dropdown-item.danger:hover {
          background-color: rgba(239, 68, 68, 0.15);
        }

        /* MAIN WORKSPACE */
        .orch-main {
          flex: 1;
          margin-left: 260px;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          background-color: var(--dash-bg);
          min-width: 0;
        }

        /* MODERN SLENDER TOPBAR */
        .orch-topbar {
          height: 60px;
          position: sticky;
          top: 0;
          z-index: 40;
          background-color: #ffffff;
          border-bottom: 1px solid var(--dash-border);
          padding: 0 28px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          gap: 16px;
        }

        html.dark .orch-topbar {
          background-color: #0f172a;
          border-bottom-color: #1e293b;
        }

        .orch-topbar-left {
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 0;
        }

        .orch-mobile-toggle {
          display: none;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border-radius: 8px;
          border: 1px solid var(--dash-border);
          background: #fff;
          color: #475569;
          cursor: pointer;
        }

        .orch-topbar-icon-wrap {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background-color: #ecfeff;
          color: #0891b2;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        html.dark .orch-topbar-icon-wrap {
          background-color: rgba(8, 145, 178, 0.2);
          color: #38bdf8;
        }

        .orch-topbar-breadcrumbs {
          display: flex;
          align-items: center;
          gap: 7px;
          font-size: 13px;
          min-width: 0;
        }

        .orch-crumb-root {
          font-weight: 700;
          color: #94a3b8;
        }

        .orch-crumb-sep {
          color: #cbd5e1;
        }

        .orch-crumb-current {
          font-weight: 750;
          color: var(--dash-text);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .orch-topbar-right {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-shrink: 0;
        }

        .orch-cluster-status-pill {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 5px 11px;
          border-radius: 99px;
          background-color: #ecfdf5;
          border: 1px solid #a7f3d0;
          font-size: 11px;
          font-weight: 700;
          color: #047857;
          white-space: nowrap;
        }

        html.dark .orch-cluster-status-pill {
          background-color: rgba(16, 185, 129, 0.12);
          border-color: rgba(16, 185, 129, 0.3);
          color: #34d399;
        }

        .orch-status-indicator {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background-color: #10b981;
          box-shadow: 0 0 6px #10b981;
        }

        .orch-icon-btn {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid var(--dash-border);
          background-color: #ffffff;
          color: #64748b;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        html.dark .orch-icon-btn {
          background-color: #1e293b;
          border-color: #334155;
          color: #cbd5e1;
        }

        .orch-icon-btn:hover {
          color: #0891b2;
          border-color: #9bd8e5;
          background-color: #ecfeff;
        }

        html.dark .orch-icon-btn:hover {
          color: #38bdf8;
          border-color: #0891b2;
          background-color: #0f172a;
        }

        .orch-topbar-avatar {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background: linear-gradient(135deg, #0891b2 0%, #2563eb 100%);
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 12px;
          border: 0;
          cursor: pointer;
          box-shadow: 0 2px 6px rgba(8, 145, 178, 0.25);
          transition: transform 0.15s ease;
        }

        .orch-topbar-avatar:hover {
          transform: scale(1.05);
        }

        /* PAGE CONTAINER WRAPPER */
        .orch-page-container {
          flex: 1;
          width: 100%;
          min-width: 0;
        }

        .orch-page-container.studio-mode {
          padding: 0;
          height: calc(100vh - 60px);
          overflow: hidden;
        }

        .orch-page-container.has-dash-page {
          padding: 0;
        }

        .orch-page-container.standard-mode {
          padding: 24px 32px 48px;
          max-width: 1560px;
        }

        /* CONFIRMATION MODAL */
        .dash-modal-backdrop {
          position: fixed;
          inset: 0;
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          background: rgba(15,23,42,.52);
          backdrop-filter: blur(4px);
        }

        .dash-modal {
          width: min(100%, 640px);
          max-height: 90vh;
          overflow: auto;
          background: #fff;
          border: 1px solid var(--dash-border);
          border-radius: 18px;
          box-shadow: 0 24px 70px rgba(15,23,42,.25);
        }

        html.dark .dash-modal {
          background: #0f172a;
          border-color: #334155;
          box-shadow: 0 24px 70px rgba(0,0,0,.6);
        }

        .dash-modal-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          padding: 18px 22px;
          background: #fff;
          border-bottom: 1px solid var(--dash-border);
        }

        html.dark .dash-modal-head {
          background: #0f172a;
          border-bottom-color: #334155;
        }

        .dash-modal-title-group {
          display: flex;
          align-items: center;
          gap: 12px;
          flex: 1;
          min-width: 0;
        }

        .dash-modal-icon-badge {
          width: 38px;
          height: 38px;
          display: grid;
          place-items: center;
          border-radius: 10px;
          flex-shrink: 0;
        }

        .dash-modal-icon-badge.rose { background: #fef2f2; color: #dc2626; }

        .dash-modal-title {
          margin: 0;
          font-size: 15px;
          font-weight: 800;
          color: var(--dash-text);
        }

        .dash-modal-subtitle {
          display: block;
          margin-top: 2px;
          color: var(--dash-muted);
          font-size: 11px;
        }

        .dash-modal-body {
          padding: 20px 22px;
        }

        .dash-modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          padding: 14px 22px;
          background: #f8fafc;
          border-top: 1px solid var(--dash-border);
        }

        html.dark .dash-modal-actions {
          background: #1e293b;
          border-top-color: #334155;
        }

        .dash-btn {
          display: inline-flex;
          justify-content: center;
          align-items: center;
          gap: 6px;
          padding: 8px 14px;
          border: 1px solid transparent;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          transition: .15s ease;
        }

        .dash-btn-outline {
          color: #475569;
          background: #fff;
          border-color: var(--dash-border);
        }

        .dash-btn-outline:hover {
          color: var(--dash-primary);
          border-color: #9bd8e5;
        }

        .dash-btn-danger {
          color: #ffffff;
          background: #ef4444;
        }

        .dash-btn-danger:hover {
          background: #dc2626;
        }

        .dash-btn-xs {
          padding: 6px 12px;
          font-size: 11px;
          border-radius: 7px;
        }

        .dash-icon-btn.xs {
          width: 26px;
          height: 26px;
        }

        /* MOBILE BACKDROP */
        .orch-mobile-backdrop {
          display: none;
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.6);
          backdrop-filter: blur(2px);
          z-index: 45;
        }

        /* RESPONSIVE BREAKPOINTS */
        @media (max-width: 900px) {
          .orch-sidebar {
            transform: translateX(-100%);
          }

          .orch-sidebar.mobile-open {
            transform: translateX(0);
          }

          .orch-mobile-backdrop.open {
            display: block;
          }

          .orch-main {
            margin-left: 0;
          }

          .orch-mobile-toggle {
            display: flex;
          }

          .orch-topbar {
            padding: 0 16px;
          }

          .orch-page-container.standard-mode {
            padding: 16px;
          }
        }
      `}</style>

      {/* Mobile Drawer Backdrop */}
      <div
        className={`orch-mobile-backdrop ${mobileMenuOpen ? "open" : ""}`}
        onClick={() => setMobileMenuOpen(false)}
      />

      {/* Sidebar Navigation */}
      <aside className={`orch-sidebar ${mobileMenuOpen ? "mobile-open" : ""}`}>
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
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      `orch-nav-item${isActive ? " active" : ""}`
                    }
                  >
                    <span className="orch-nav-icon">
                      <I name={it.icon} size={18} />
                    </span>
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
              <span className="orch-cluster-sub">
                {metrics?.activeWorkers ?? 3} Workers Online
              </span>
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
              <div
                className="orch-user-dropdown"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="orch-dropdown-header">
                  <div className="orch-dropdown-name">{displayName}</div>
                  <div className="orch-dropdown-email">{current?.email}</div>
                  <span className="orch-role-pill">{roleUi(current?.role)}</span>
                </div>
                <div className="orch-dropdown-divider" />
                <button
                  type="button"
                  onClick={() => go("/profile")}
                  className="orch-dropdown-item"
                >
                  <I name="user" size={15} />
                  <span>Hồ sơ cá nhân</span>
                </button>
                <button
                  type="button"
                  onClick={() => go("/audit")}
                  className="orch-dropdown-item"
                >
                  <I name="history" size={15} />
                  <span>Lịch sử kiểm toán</span>
                </button>
                <div className="orch-dropdown-divider" />
                <button
                  type="button"
                  className="orch-dropdown-item danger"
                  onClick={logout}
                >
                  <I name="log-out" size={15} />
                  <span>Đăng xuất</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Workspace */}
      <div className="orch-main">
        {/* Slender Modern Topbar */}
        <header className="orch-topbar">
          <div className="orch-topbar-left">
            <button
              type="button"
              className="orch-mobile-toggle"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Mở menu"
            >
              <I name="menu" size={18} />
            </button>

            <div className="orch-topbar-icon-wrap">
              <I name={pageMeta.icon} size={17} />
            </div>

            <div className="orch-topbar-breadcrumbs">
              <span className="orch-crumb-root">FlowForge</span>
              <span className="orch-crumb-sep">/</span>
              <span className="orch-crumb-current">{pageMeta.breadcrumb}</span>
            </div>
          </div>

          <div className="orch-topbar-right">
            {/* Cluster Status Badge */}
            <div className="orch-cluster-status-pill">
              <span className="orch-status-indicator" />
              <span>Master Node: Ready</span>
            </div>

            {/* Dark / Light Mode Toggle */}
            <button
              type="button"
              className="orch-icon-btn"
              aria-label={darkMode ? "Giao diện sáng" : "Giao diện tối"}
              title={darkMode ? "Giao diện sáng" : "Giao diện tối"}
              onClick={() => setDarkMode((v) => !v)}
            >
              <I name={darkMode ? "sun" : "moon"} size={16} />
            </button>

            {/* Quick Profile Avatar */}
            <button
              type="button"
              className="orch-topbar-avatar"
              title={`Hồ sơ: ${displayName}`}
              onClick={() => go("/profile")}
            >
              {mark}
            </button>
          </div>
        </header>

        {/* Dynamic Page Container */}
        <main
          className={`orch-page-container ${
            isStudio
              ? "studio-mode"
              : isDashPage
              ? "has-dash-page"
              : "standard-mode"
          }`}
        >
          <Outlet />
        </main>
      </div>

      {/* Confirmation Modal */}
      {confirm && (
        <div className="dash-modal-backdrop" onClick={() => setConfirm(null)}>
          <div
            className="dash-modal"
            style={{ maxWidth: "440px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="dash-modal-head">
              <div className="dash-modal-title-group">
                <div className="dash-modal-icon-badge rose">
                  <I name="triangle-alert" size={20} />
                </div>
                <div>
                  <h3 className="dash-modal-title">Xác nhận thao tác</h3>
                  <span className="dash-modal-subtitle">
                    Vui lòng kiểm tra kỹ trước khi xác nhận
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="dash-icon-btn xs"
                onClick={() => setConfirm(null)}
              >
                <I name="x" size={14} />
              </button>
            </div>

            <div className="dash-modal-body">
              <p
                style={{
                  margin: 0,
                  fontSize: "13px",
                  lineHeight: "1.6",
                  color: "#334155",
                }}
              >
                {confirm?.text}
              </p>
            </div>

            <div className="dash-modal-actions">
              <button
                type="button"
                className="dash-btn dash-btn-outline dash-btn-xs"
                onClick={() => setConfirm(null)}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                className="dash-btn dash-btn-danger dash-btn-xs"
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
