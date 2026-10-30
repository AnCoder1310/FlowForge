
import { useEffect, useMemo, useState } from "react";
import { useOrchestrator } from "../../../lib/store";
import { I } from "../../../lib/icons";
import { useNavigate } from "react-router-dom";

/* =========================================
   HELPERS
========================================= */

const formatDate = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatDuration = (start, end) => {
  if (!start) return "—";

  const from = new Date(start).getTime();
  const to = end ? new Date(end).getTime() : Date.now();

  if (!Number.isFinite(from) || !Number.isFinite(to) || to < from) {
    return "—";
  }

  const seconds = Math.floor((to - from) / 1000);

  if (seconds < 60) return `${seconds}s`;

  const minutes = Math.floor(seconds / 60);

  if (minutes < 60) {
    return `${minutes}m ${seconds % 60}s`;
  }

  const hours = Math.floor(minutes / 60);

  return `${hours}h ${minutes % 60}m`;
};

const getStatusClass = (status) => {
  const value = String(status || "").toUpperCase();

  if (["RUNNING", "SCHEDULED"].includes(value)) return "running";
  if (["COMPLETED", "SUCCESS"].includes(value)) return "completed";
  if (["FAILED", "TIMEOUT"].includes(value)) return "failed";
  if (["CANCELLED"].includes(value)) return "cancelled";

  return "neutral";
};

/* =========================================
   REUSABLE COMPONENTS
========================================= */

function StatCard({
  icon,
  label,
  value,
  description,
  variant,
  footer,
}) {
  return (
    <article className={`dash-stat-card ${variant}`}>
      <div className="dash-stat-top">
        <span className="dash-stat-label">{label}</span>

        <div className="dash-stat-icon">
          <I name={icon} size={20} />
        </div>
      </div>

      <div className="dash-stat-value">{value}</div>

      <div className="dash-stat-bottom">
        <span className="dash-stat-description">{description}</span>
        {footer}
      </div>
    </article>
  );
}

function SectionHeader({ title, subtitle, action }) {
  return (
    <div className="dash-section-header">
      <div>
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </div>

      {action}
    </div>
  );
}

/* =========================================
   DASHBOARD
========================================= */

export default function Dashboard() {
  const {
    metrics,
    executions,
    workflows,
    loadWorkflows,
    loadMetrics,
    loadExecutions,
    triggerWorkflow,
    toast,
  } = useOrchestrator();

  const nav = useNavigate();

  const [triggeringId, setTriggeringId] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadWorkflows();
    loadMetrics();
    loadExecutions();
  }, [loadWorkflows, loadMetrics, loadExecutions]);

  /* KPI DATA */

  const completed = Number(metrics.completedInstances || 0);
  const failed = Number(metrics.failedInstances || 0);
  const running = Number(metrics.runningInstances || 0);

  const totalRuns = completed + failed + running;

  const successRate =
    completed + failed > 0
      ? Math.round((completed / (completed + failed)) * 100)
      : null;

  const activeQueues = useMemo(() => {
    return new Set(
      workflows.flatMap((wf) =>
        (wf.dag?.steps || []).map((step) => step.queue || "default")
      )
    ).size;
  }, [workflows]);

  /* REFRESH */

  const handleRefresh = async () => {
    setRefreshing(true);

    try {
      await Promise.all([
        loadWorkflows(),
        loadMetrics(),
        loadExecutions(),
      ]);
    } catch (error) {
      toast(error.message || "Không thể tải dữ liệu", "danger");
    } finally {
      setRefreshing(false);
    }
  };

  /* TRIGGER WORKFLOW */

  const handleQuickTrigger = async (workflowId) => {
    setTriggeringId(workflowId);

    try {
      const payload = JSON.stringify({
        source: "dashboard",
        timestamp: Date.now(),
      });

      await triggerWorkflow(workflowId, payload);

      toast("Đã kích hoạt Workflow thành công!", "success");

      await Promise.all([
        loadExecutions(),
        loadMetrics(),
      ]);
    } catch (error) {
      toast(error.message || "Không thể kích hoạt Workflow", "danger");
    } finally {
      setTriggeringId(null);
    }
  };

  return (
    <main className="dash-page">

      <style>{`

        /* =====================================
           DASHBOARD DESIGN SYSTEM
        ===================================== */

        .dash-page {
          --dash-primary: #0891b2;
          --dash-primary-dark: #0e7490;
          --dash-text: #172033;
          --dash-muted: #8490a3;
          --dash-border: #e8edf3;
          --dash-bg: #f6f8fb;

          display: flex;
          flex-direction: column;
          gap: 24px;
          padding: 28px;
          min-height: 100%;
          color: var(--dash-text);
          background: var(--dash-bg);
        }

        .dash-page * {
          box-sizing: border-box;
        }

        /* HEADER */

        .dash-page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 20px;
        }

        .dash-eyebrow {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 10px;
          color: var(--dash-primary);
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 1.5px;
        }

        .dash-live-dot {
          width: 8px;
          height: 8px;
          display: inline-block;
          flex-shrink: 0;
          border-radius: 50%;
          background: #10b981;
          box-shadow: 0 0 0 4px rgba(16,185,129,.10);
        }

        .dash-page-header h1 {
          margin: 0;
          font-size: 30px;
          font-weight: 800;
          letter-spacing: -1px;
        }

        .dash-page-header p {
          margin: 7px 0 0;
          color: var(--dash-muted);
          font-size: 13px;
          line-height: 1.6;
        }

        .dash-header-actions {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        .dash-btn {
          display: inline-flex;
          justify-content: center;
          align-items: center;
          gap: 8px;
          padding: 10px 15px;
          border: 1px solid transparent;
          border-radius: 9px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          transition: .2s ease;
          white-space: nowrap;
        }

        .dash-btn:disabled {
          opacity: .55;
          cursor: not-allowed;
        }

        .dash-btn-primary {
          color: #fff;
          background: var(--dash-primary);
          box-shadow: 0 4px 12px rgba(8,145,178,.18);
        }

        .dash-btn-primary:hover:not(:disabled) {
          background: var(--dash-primary-dark);
          transform: translateY(-1px);
        }

        .dash-btn-outline {
          color: #475569;
          background: #fff;
          border-color: var(--dash-border);
        }

        .dash-btn-outline:hover:not(:disabled) {
          color: var(--dash-primary);
          border-color: #9bd8e5;
        }

        /* =====================================
           KPI CARDS
        ===================================== */

        .dash-stats-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 16px;
        }

        .dash-stat-card {
          min-width: 0;
          padding: 20px;
          background: #fff;
          border: 1px solid var(--dash-border);
          border-radius: 14px;
          box-shadow: 0 2px 8px rgba(15,23,42,.025);
          transition: .2s ease;
        }

        .dash-stat-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 9px 24px rgba(15,23,42,.06);
        }

        .dash-stat-top,
        .dash-stat-bottom {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
        }

        .dash-stat-label {
          color: #64748b;
          font-size: 12px;
          font-weight: 600;
        }

        .dash-stat-icon {
          width: 38px;
          height: 38px;
          display: grid;
          place-items: center;
          border-radius: 10px;
        }

        .dash-stat-value {
          margin: 17px 0;
          font-size: 32px;
          line-height: 1;
          font-weight: 800;
          letter-spacing: -1.2px;
          font-variant-numeric: tabular-nums;
        }

        .dash-stat-description {
          color: var(--dash-muted);
          font-size: 10px;
        }

        .dash-mini-badge {
          padding: 5px 7px;
          color: #64748b;
          background: #f1f5f9;
          border-radius: 6px;
          font-size: 10px;
          font-weight: 700;
          white-space: nowrap;
        }

        .dash-stat-card.blue .dash-stat-icon {
          color: #2563eb;
          background: #eff6ff;
        }

        .dash-stat-card.blue .dash-stat-value {
          color: #2563eb;
        }

        .dash-stat-card.cyan .dash-stat-icon {
          color: #0891b2;
          background: #ecfeff;
        }

        .dash-stat-card.cyan .dash-stat-value {
          color: #0891b2;
        }

        .dash-stat-card.orange .dash-stat-icon {
          color: #d97706;
          background: #fffbeb;
        }

        .dash-stat-card.orange .dash-stat-value {
          color: #d97706;
        }

        .dash-stat-card.purple .dash-stat-icon {
          color: #7c3aed;
          background: #f5f3ff;
        }

        .dash-stat-card.purple .dash-stat-value {
          color: #7c3aed;
        }

        /* =====================================
           MAIN GRID
        ===================================== */

        .dash-main-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.3fr) minmax(320px, .85fr);
          gap: 18px;
          align-items: stretch;
        }

        .dash-panel {
          min-width: 0;
          padding: 21px;
          background: #fff;
          border: 1px solid var(--dash-border);
          border-radius: 14px;
          box-shadow: 0 2px 8px rgba(15,23,42,.025);
        }

        .dash-section-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
          margin-bottom: 20px;
        }

        .dash-section-header h2 {
          margin: 0;
          font-size: 15px;
          font-weight: 800;
          letter-spacing: -.3px;
        }

        .dash-section-header p {
          margin: 6px 0 0;
          color: var(--dash-muted);
          font-size: 11px;
          line-height: 1.5;
        }

        .dash-text-btn {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          color: var(--dash-primary);
          background: transparent;
          border: none;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
          white-space: nowrap;
        }

        /* =====================================
           WORKFLOW LIST
        ===================================== */

        .dash-workflow-list {
          display: flex;
          flex-direction: column;
        }

        .dash-workflow-item {
          display: flex;
          align-items: center;
          gap: 13px;
          padding: 16px 0;
          border-top: 1px solid #f0f3f7;
        }

        .dash-workflow-icon {
          width: 42px;
          height: 42px;
          display: grid;
          flex-shrink: 0;
          place-items: center;
          color: var(--dash-primary);
          background: #ecfeff;
          border-radius: 11px;
        }

        .dash-workflow-info {
          flex: 1;
          min-width: 0;
        }

        .dash-workflow-title {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 7px;
        }

        .dash-workflow-title h3 {
          margin: 0;
          font-size: 12px;
          font-weight: 750;
        }

        .dash-version {
          padding: 3px 5px;
          color: #64748b;
          background: #f1f5f9;
          border-radius: 5px;
          font-size: 9px;
        }

        .dash-validated {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 3px 6px;
          color: #059669;
          background: #ecfdf5;
          border-radius: 5px;
          font-size: 9px;
          font-weight: 700;
        }

        .dash-workflow-info > p {
          overflow: hidden;
          margin: 6px 0;
          color: var(--dash-muted);
          font-size: 10px;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .dash-workflow-meta {
          display: flex;
          align-items: center;
          gap: 13px;
          flex-wrap: wrap;
        }

        .dash-workflow-meta span {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          color: #64748b;
          font-size: 10px;
        }

        .dash-btn-run {
          flex-shrink: 0;
          padding: 8px 11px;
          color: var(--dash-primary);
          background: #ecfeff;
          border: 1px solid #cffafe;
          font-size: 10px;
        }

        .dash-btn-run:hover:not(:disabled) {
          background: #cffafe;
        }

        /* EMPTY STATE */

        .dash-empty {
          padding: 35px 15px;
          text-align: center;
        }

        .dash-empty-icon {
          width: 55px;
          height: 55px;
          display: grid;
          place-items: center;
          margin: 0 auto 13px;
          color: var(--dash-primary);
          background: #ecfeff;
          border-radius: 15px;
        }

        .dash-empty h3 {
          margin: 0 0 7px;
          font-size: 13px;
        }

        .dash-empty p {
          margin: 0 0 17px;
          color: var(--dash-muted);
          font-size: 11px;
        }

        /* =====================================
           CLUSTER
        ===================================== */

        .dash-cluster-status {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 9px;
          color: #059669;
          background: #ecfdf5;
          border-radius: 7px;
          font-size: 10px;
          font-weight: 700;
          white-space: nowrap;
        }

        .dash-engine-highlight {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 17px;
          margin-bottom: 15px;
          background: linear-gradient(120deg, #ecfeff, #f0fdfa);
          border: 1px solid #cffafe;
          border-radius: 11px;
        }

        .dash-engine-icon {
          width: 46px;
          height: 46px;
          display: grid;
          flex-shrink: 0;
          place-items: center;
          color: #0891b2;
          background: #fff;
          border-radius: 12px;
          box-shadow: 0 2px 7px rgba(8,145,178,.08);
        }

        .dash-engine-highlight span {
          color: #0e7490;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: .7px;
          text-transform: uppercase;
        }

        .dash-engine-highlight h3 {
          margin: 4px 0;
          font-size: 14px;
          font-weight: 800;
        }

        .dash-engine-highlight p {
          margin: 0;
          color: #64748b;
          font-size: 10px;
        }

        .dash-feature-list {
          display: flex;
          flex-direction: column;
        }

        .dash-feature {
          display: flex;
          align-items: center;
          gap: 11px;
          padding: 12px 0;
          border-bottom: 1px solid #f0f3f7;
        }

        .dash-feature-icon {
          width: 34px;
          height: 34px;
          display: grid;
          flex-shrink: 0;
          place-items: center;
          border-radius: 9px;
        }

        .dash-feature-icon.blue {
          color: #2563eb;
          background: #eff6ff;
        }

        .dash-feature-icon.cyan {
          color: #0891b2;
          background: #ecfeff;
        }

        .dash-feature-icon.purple {
          color: #7c3aed;
          background: #f5f3ff;
        }

        .dash-feature-icon.orange {
          color: #d97706;
          background: #fffbeb;
        }

        .dash-feature > div:nth-child(2) {
          flex: 1;
          min-width: 0;
        }

        .dash-feature h4 {
          margin: 0;
          font-size: 11px;
          font-weight: 750;
        }

        .dash-feature p {
          margin: 4px 0 0;
          color: var(--dash-muted);
          font-size: 10px;
          line-height: 1.5;
        }

        .dash-feature > svg {
          flex-shrink: 0;
          color: #10b981;
        }

        .dash-cluster-link {
          display: flex;
          justify-content: space-between;
          align-items: center;
          width: 100%;
          margin-top: 14px;
          padding: 5px 0;
          color: var(--dash-primary);
          background: transparent;
          border: 0;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
        }

        /* =====================================
           EXECUTIONS TABLE
        ===================================== */

        .dash-execution-panel {
          padding-bottom: 14px;
        }

        .dash-table-wrapper {
          width: 100%;
          overflow-x: auto;
        }

        .dash-table {
          width: 100%;
          min-width: 760px;
          border-collapse: collapse;
        }

        .dash-table thead th {
          padding: 12px 11px;
          color: #94a3b8;
          background: #f8fafc;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: .6px;
          text-align: left;
          white-space: nowrap;
        }

        .dash-table tbody td {
          padding: 14px 11px;
          color: #64748b;
          border-bottom: 1px solid #f0f3f7;
          font-size: 10px;
          white-space: nowrap;
        }

        .dash-table tbody tr:hover {
          background: #fafcfe;
        }

        .dash-run-id {
          padding: 5px 7px;
          color: #475569;
          background: #f1f5f9;
          border-radius: 5px;
          font-size: 10px;
          font-weight: 700;
        }

        .dash-table-workflow {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .dash-table-workflow strong {
          color: #1e293b;
          font-size: 11px;
        }

        .dash-table-workflow span {
          color: #94a3b8;
          font-size: 9px;
        }

        .dash-status {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 5px 8px;
          border-radius: 6px;
          font-size: 9px;
          font-weight: 750;
        }

        .dash-status.completed {
          color: #059669;
          background: #ecfdf5;
        }

        .dash-status.running {
          color: #2563eb;
          background: #eff6ff;
        }

        .dash-status.failed {
          color: #dc2626;
          background: #fef2f2;
        }

        .dash-status.cancelled {
          color: #64748b;
          background: #f1f5f9;
        }

        .dash-status.neutral {
          color: #64748b;
          background: #f8fafc;
        }

        .dash-status-dot {
          width: 6px;
          height: 6px;
          background: currentColor;
          border-radius: 50%;
          animation: dash-pulse 1.5s infinite;
        }

        @keyframes dash-pulse {
          50% {
            opacity: .35;
          }
        }

        .dash-progress {
          display: flex;
          align-items: center;
          gap: 9px;
          min-width: 115px;
        }

        .dash-progress-track {
          flex: 1;
          height: 6px;
          overflow: hidden;
          background: #edf1f5;
          border-radius: 20px;
        }

        .dash-progress-fill {
          height: 100%;
          border-radius: inherit;
          transition: width .3s ease;
        }

        .dash-progress-fill.completed {
          background: #10b981;
        }

        .dash-progress-fill.running {
          background: #0891b2;
        }

        .dash-progress-fill.failed {
          background: #ef4444;
        }

        .dash-progress-fill.neutral {
          background: #94a3b8;
        }

        .dash-progress span {
          color: #64748b;
          font-size: 9px;
          font-weight: 700;
        }

        .dash-duration {
          font-variant-numeric: tabular-nums;
          font-weight: 650;
        }

        .dash-icon-btn {
          width: 29px;
          height: 29px;
          display: grid;
          place-items: center;
          color: #64748b;
          background: #fff;
          border: 1px solid var(--dash-border);
          border-radius: 7px;
          cursor: pointer;
        }

        .dash-icon-btn:hover {
          color: var(--dash-primary);
          border-color: #a5f3fc;
          background: #ecfeff;
        }

        .dash-table-empty {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 10px;
          padding: 30px;
          color: #94a3b8;
          font-size: 11px;
        }

        .dash-table-footer {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          padding: 13px 3px 0;
          color: #94a3b8;
          font-size: 10px;
        }

        .dash-total-runs {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        /* =====================================
           RESPONSIVE
        ===================================== */

        @media (max-width: 1100px) {
          .dash-stats-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .dash-main-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 650px) {
          .dash-page {
            gap: 17px;
            padding: 16px;
          }

          .dash-page-header {
            align-items: flex-start;
            flex-direction: column;
          }

          .dash-page-header h1 {
            font-size: 25px;
          }

          .dash-header-actions {
            width: 100%;
          }

          .dash-header-actions button {
            flex: 1;
          }

          .dash-stats-grid {
            gap: 10px;
          }

          .dash-stat-card {
            padding: 14px;
          }

          .dash-stat-value {
            font-size: 26px;
          }

          .dash-stat-bottom {
            align-items: flex-start;
            flex-direction: column;
          }

          .dash-panel {
            padding: 15px;
          }

          .dash-workflow-item {
            flex-wrap: wrap;
          }

          .dash-workflow-info {
            width: calc(100% - 60px);
          }

          .dash-btn-run {
            margin-left: 55px;
          }

          .dash-table-footer {
            flex-direction: column;
          }
        }

      `}</style>

      {/* =====================================
          PAGE HEADER
      ===================================== */}

      <header className="dash-page-header">
        <div>
          <div className="dash-eyebrow">
            <span className="dash-live-dot" />
            WORKFLOW CONTROL CENTER
          </div>

          <h1>Dashboard</h1>

          <p>
            Theo dõi, điều phối và giám sát hoạt động của hệ thống
            Workflow Orchestrator.
          </p>
        </div>

        <div className="dash-header-actions">
          <button
            className="dash-btn dash-btn-outline"
            disabled={refreshing}
            onClick={handleRefresh}
          >
            <I name="activity" size={15} />
            {refreshing ? "Đang tải..." : "Làm mới dữ liệu"}
          </button>

          <button
            className="dash-btn dash-btn-primary"
            onClick={() => nav("/workflows")}
          >
            <I name="plus" size={16} />
            Tạo Workflow
          </button>
        </div>
      </header>

      {/* =====================================
          KPI SECTION
      ===================================== */}

      <section className="dash-stats-grid">
        <StatCard
          icon="git-fork"
          label="Tổng Workflow"
          value={metrics.totalWorkflows || 0}
          description="Quy trình đã đăng ký"
          variant="blue"
          footer={
            <span className="dash-mini-badge">
              {metrics.activeWorkflows || 0} đang hoạt động
            </span>
          }
        />

        <StatCard
          icon="activity"
          label="Đang thực thi"
          value={running}
          description="Workflow đang chạy"
          variant="cyan"
          footer={
            <span className="dash-mini-badge">
              {completed} hoàn thành
            </span>
          }
        />

        <StatCard
          icon="server"
          label="Active Workers"
          value={metrics.activeWorkers || 0}
          description="Worker đang hoạt động"
          variant="orange"
          footer={
            <span className="dash-mini-badge">
              {activeQueues} task queues
            </span>
          }
        />

        <StatCard
          icon="pie-chart"
          label="Tỷ lệ thành công"
          value={successRate === null ? "—" : `${successRate}%`}
          description="Dựa trên lượt chạy đã kết thúc"
          variant="purple"
          footer={
            <span className="dash-mini-badge">
              {failed} lượt thất bại
            </span>
          }
        />
      </section>

      {/* =====================================
          MAIN CONTENT
      ===================================== */}

      <section className="dash-main-grid">

        {/* WORKFLOW LIST */}

        <div className="dash-panel dash-workflow-panel">
          <SectionHeader
            title="Workflow sẵn sàng kích hoạt"
            subtitle="Khởi chạy các quy trình đã được xác thực DAG."
            action={
              <button
                className="dash-text-btn"
                onClick={() => nav("/workflows")}
              >
                Xem tất cả
                <I name="arrow-right" size={15} />
              </button>
            }
          />

          <div className="dash-workflow-list">
            {workflows.length === 0 ? (
              <div className="dash-empty">
                <div className="dash-empty-icon">
                  <I name="git-fork" size={28} />
                </div>

                <h3>Chưa có Workflow nào</h3>

                <p>
                  Tạo Workflow đầu tiên để bắt đầu tự động hóa quy trình.
                </p>

                <button
                  className="dash-btn dash-btn-primary"
                  onClick={() => nav("/workflows")}
                >
                  <I name="plus" size={15} />
                  Tạo Workflow
                </button>
              </div>
            ) : (
              workflows.slice(0, 5).map((wf) => {
                const steps = wf.dag?.steps || [];

                const queues = [
                  ...new Set(
                    steps.map((step) => step.queue || "default")
                  ),
                ];

                return (
                  <article className="dash-workflow-item" key={wf.id}>
                    <div className="dash-workflow-icon">
                      <I name="git-fork" size={20} />
                    </div>

                    <div className="dash-workflow-info">
                      <div className="dash-workflow-title">
                        <h3>{wf.name}</h3>

                        <span className="dash-version">
                          v{wf.version}
                        </span>

                        <span className="dash-validated">
                          <I name="check-circle" size={12} />
                          Validated
                        </span>
                      </div>

                      <p>
                        {wf.description || "Chưa có mô tả Workflow."}
                      </p>

                      <div className="dash-workflow-meta">
                        <span>
                          <I name="layers" size={13} />
                          {steps.length} Steps
                        </span>

                        <span>
                          <I name="network" size={13} />
                          {queues.length} Queues
                        </span>
                      </div>
                    </div>

                    <button
                      className="dash-btn dash-btn-run"
                      disabled={triggeringId === wf.id}
                      onClick={() => handleQuickTrigger(wf.id)}
                    >
                      <I name="play" size={14} />

                      {triggeringId === wf.id
                        ? "Đang kích hoạt..."
                        : "Kích hoạt"}
                    </button>
                  </article>
                );
              })
            )}
          </div>
        </div>

        {/* CLUSTER OVERVIEW */}

        <div className="dash-panel dash-cluster-panel">
          <SectionHeader
            title="Cluster Overview"
            subtitle="Tổng quan kiến trúc điều phối."
            action={
              <span className="dash-cluster-status">
                <span className="dash-live-dot" />
                Monitoring
              </span>
            }
          />

          <div className="dash-engine-highlight">
            <div className="dash-engine-icon">
              <I name="network" size={25} />
            </div>

            <div>
              <span>Execution Engine</span>
              <h3>DAG Orchestrator</h3>
              <p>Kahn's Algorithm · Dependency Scheduling</p>
            </div>
          </div>

          <div className="dash-feature-list">
            <div className="dash-feature">
              <div className="dash-feature-icon blue">
                <I name="git-fork" size={17} />
              </div>

              <div>
                <h4>DAG Scheduler</h4>
                <p>Phân tầng và điều phối các Step độc lập.</p>
              </div>

              <I name="check-circle" size={16} />
            </div>

            <div className="dash-feature">
              <div className="dash-feature-icon cyan">
                <I name="layers" size={17} />
              </div>

              <div>
                <h4>Queue Dispatcher</h4>
                <p>Phân phối tác vụ đến các Worker Queue.</p>
              </div>

              <I name="check-circle" size={16} />
            </div>

            <div className="dash-feature">
              <div className="dash-feature-icon purple">
                <I name="bot" size={17} />
              </div>

              <div>
                <h4>AI Diagnostics</h4>
                <p>Hỗ trợ phân tích lỗi và chẩn đoán thực thi.</p>
              </div>

              <I name="check-circle" size={16} />
            </div>

            <div className="dash-feature">
              <div className="dash-feature-icon orange">
                <I name="shield" size={17} />
              </div>

              <div>
                <h4>Security & Reliability</h4>
                <p>RBAC, Retry Policy và Audit Logging.</p>
              </div>

              <I name="check-circle" size={16} />
            </div>
          </div>

          <button
            className="dash-cluster-link"
            onClick={() => nav("/workers")}
          >
            Quản lý Workers
            <I name="arrow-right" size={15} />
          </button>
        </div>
      </section>

      {/* =====================================
          RECENT EXECUTIONS
      ===================================== */}

      <section className="dash-panel dash-execution-panel">
        <SectionHeader
          title="Recent Executions"
          subtitle="Theo dõi những lượt thực thi Workflow gần đây."
          action={
            <button
              className="dash-btn dash-btn-outline"
              onClick={() => nav("/executions")}
            >
              Xem lịch sử
              <I name="arrow-right" size={14} />
            </button>
          }
        />

        <div className="dash-table-wrapper">
          <table className="dash-table">
            <thead>
              <tr>
                <th>RUN ID</th>
                <th>WORKFLOW</th>
                <th>STATUS</th>
                <th>STEP PROGRESS</th>
                <th>STARTED AT</th>
                <th>DURATION</th>
                <th></th>
              </tr>
            </thead>

            <tbody>
              {executions.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className="dash-table-empty">
                      <I name="layers" size={25} />
                      <span>Chưa có lượt thực thi nào.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                executions.slice(0, 6).map((ex) => {
                  const tasks = ex.tasks || [];
                  const totalSteps = tasks.length;

                  const completedSteps = tasks.filter((task) =>
                    ["COMPLETED", "SUCCESS"].includes(
                      String(task.status).toUpperCase()
                    )
                  ).length;

                  const pct =
                    totalSteps > 0
                      ? Math.round(
                          (completedSteps / totalSteps) * 100
                        )
                      : 0;

                  const statusClass = getStatusClass(ex.status);
                  const isRunning = statusClass === "running";

                  return (
                    <tr key={ex.id}>
                      <td>
                        <code className="dash-run-id">
                          #{ex.id}
                        </code>
                      </td>

                      <td>
                        <div className="dash-table-workflow">
                          <strong>
                            {ex.workflowName || "Unknown Workflow"}
                          </strong>

                          <span>
                            Version {ex.version || 1}
                          </span>
                        </div>
                      </td>

                      <td>
                        <span className={`dash-status ${statusClass}`}>
                          {isRunning && (
                            <span className="dash-status-dot" />
                          )}

                          {ex.status}
                        </span>
                      </td>

                      <td>
                        <div className="dash-progress">
                          <div className="dash-progress-track">
                            <div
                              className={`dash-progress-fill ${statusClass}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>

                          <span>
                            {completedSteps}/{totalSteps}
                          </span>
                        </div>
                      </td>

                      <td>{formatDate(ex.createdAt)}</td>

                      <td className="dash-duration">
                        {formatDuration(
                          ex.createdAt,
                          ex.completedAt
                        )}
                      </td>

                      <td>
                        <button
                          className="dash-icon-btn"
                          title="Xem chi tiết"
                          onClick={() => nav("/executions")}
                        >
                          <I name="arrow-right" size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="dash-table-footer">
          <span>
            Đang hiển thị {Math.min(executions.length, 6)} /{" "}
            {executions.length} lượt chạy gần đây
          </span>

          <span className="dash-total-runs">
            <I name="activity" size={14} />
            {totalRuns} lượt chạy ghi nhận trong metrics
          </span>
        </div>
      </section>

    </main>
  );
}
