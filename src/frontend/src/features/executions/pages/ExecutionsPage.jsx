import { useState, useEffect, useMemo, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useOrchestrator } from "../../../lib/store";
import { I } from "../../../lib/icons";
import { api } from "../../../lib/api";

/* =========================================
   HELPERS (MATCHES DASHBOARD)
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
    second: "2-digit",
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
   REUSABLE STAT CARD (MATCHES DASHBOARD)
========================================= */

function StatCard({ icon, label, value, description, variant, footer }) {
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

/* =========================================
   EXECUTIONS PAGE
========================================= */

export default function ExecutionsPage() {
  const { executions, cancelExecution, can, toast, loadExecutions } = useOrchestrator();
  const location = useLocation();
  const nav = useNavigate();
  const highlightId = location.state?.highlightId;

  const [filterStatus, setFilterStatus] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEx, setSelectedEx] = useState(null);
  const [aiDiagnosis, setAiDiagnosis] = useState(null);
  const [diagnosing, setDiagnosing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Track if initial auto-select has already fired to prevent modal from reopening on poll
  const hasAutoSelectedRef = useRef(false);

  // Poll executions regularly to track real-time worker progress
  useEffect(() => {
    loadExecutions();
    const timer = setInterval(() => {
      loadExecutions();
    }, 2000);
    return () => clearInterval(timer);
  }, [loadExecutions]);

  // Auto-select execution AT MOST ONCE when redirected with highlightId
  useEffect(() => {
    if (highlightId && !hasAutoSelectedRef.current && executions.length > 0) {
      const found = executions.find((e) => e.id === Number(highlightId) || e.id === highlightId);
      if (found) {
        hasAutoSelectedRef.current = true;
        setSelectedEx(found);
      }
    }
  }, [highlightId, executions]);

  // Close modal handler: guarantees it stays closed and will never re-open automatically
  const handleCloseModal = () => {
    setSelectedEx(null);
    setAiDiagnosis(null);
    hasAutoSelectedRef.current = true;
  };

  // Keyboard shortcut: Press ESC to close modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        handleCloseModal();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Keep modal in sync with live polled execution tasks
  const activeEx = useMemo(() => {
    if (!selectedEx) return null;
    return executions.find((e) => e.id === selectedEx.id) || selectedEx;
  }, [selectedEx, executions]);

  const handleManualRefresh = async () => {
    setRefreshing(true);
    await loadExecutions();
    setRefreshing(false);
    toast("Đã đồng bộ trạng thái thực thi thời gian thực!", "success");
  };

  const handleAiDiagnose = async (instanceId) => {
    setDiagnosing(true);
    setAiDiagnosis(null);
    try {
      const res = await api.post("/ai/diagnose-failure", { instanceId });
      setAiDiagnosis(res);
      toast("AI đã chẩn đoán xong nguyên nhân lỗi và đề xuất tự phục hồi!", "success");
    } catch (err) {
      toast(err.message || "Lỗi chẩn đoán AI", "danger");
    } finally {
      setDiagnosing(false);
    }
  };

  // Metrics
  const statusCounts = useMemo(() => ({
    ALL: executions.length,
    RUNNING: executions.filter((e) => e.status === "RUNNING").length,
    COMPLETED: executions.filter((e) => e.status === "COMPLETED").length,
    FAILED: executions.filter((e) => e.status === "FAILED").length,
    CANCELLED: executions.filter((e) => e.status === "CANCELLED").length,
  }), [executions]);

  const completed = statusCounts.COMPLETED;
  const failed = statusCounts.FAILED;
  const running = statusCounts.RUNNING;
  const totalRuns = executions.length;
  const successRate =
    completed + failed > 0 ? Math.round((completed / (completed + failed)) * 100) : null;

  // Filter & Search
  const filtered = useMemo(() => {
    return executions.filter((e) => {
      // 1. Status Filter
      if (filterStatus !== "ALL" && e.status !== filterStatus) {
        return false;
      }
      // 2. Search Query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const runIdStr = `#${e.id}`.toLowerCase();
        const idStr = String(e.id);
        const wfName = (e.workflowName || "").toLowerCase();
        if (!runIdStr.includes(query) && !idStr.includes(query) && !wfName.includes(query)) {
          return false;
        }
      }
      return true;
    });
  }, [executions, filterStatus, searchQuery]);

  return (
    <main className="dash-page">
      <style>{`
        /* =====================================
           DASHBOARD DESIGN SYSTEM FOR EXECUTIONS
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

        .dash-live-dot.pulse {
          animation: dash-dot-pulse 2s infinite ease-in-out;
        }

        @keyframes dash-dot-pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.25); opacity: 0.7; }
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
          text-decoration: none;
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

        .dash-btn-ai {
          color: #7c3aed;
          background: #f5f3ff;
          border: 1px solid #ddd6fe;
        }

        .dash-btn-ai:hover:not(:disabled) {
          background: #ede9fe;
          border-color: #c4b5fd;
          transform: translateY(-1px);
        }

        .dash-btn-danger {
          color: #ef4444;
          background: #fef2f2;
          border: 1px solid #fee2e2;
        }

        .dash-btn-danger:hover:not(:disabled) {
          color: #dc2626;
          background: #fee2e2;
        }

        .dash-btn-xs {
          padding: 6px 10px;
          font-size: 11px;
          border-radius: 7px;
        }

        .dash-spin {
          animation: dash-spin 1s linear infinite;
        }

        @keyframes dash-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        /* KPI STATS */
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

        .dash-stat-card.blue .dash-stat-icon { color: #2563eb; background: #eff6ff; }
        .dash-stat-card.blue .dash-stat-value { color: #2563eb; }
        .dash-stat-card.cyan .dash-stat-icon { color: #0891b2; background: #ecfeff; }
        .dash-stat-card.cyan .dash-stat-value { color: #0891b2; }
        .dash-stat-card.orange .dash-stat-icon { color: #d97706; background: #fffbeb; }
        .dash-stat-card.orange .dash-stat-value { color: #d97706; }
        .dash-stat-card.purple .dash-stat-icon { color: #7c3aed; background: #f5f3ff; }
        .dash-stat-card.purple .dash-stat-value { color: #7c3aed; }

        /* PANEL */
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
          margin-bottom: 18px;
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

        /* TOOLBAR */
        .dash-toolbar-wrap {
          display: flex;
          flex-direction: column;
          gap: 14px;
          margin-bottom: 18px;
        }

        .dash-quick-tabs {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          padding-bottom: 14px;
          border-bottom: 1px solid #f0f3f7;
        }

        .dash-quick-tab {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 7px 13px;
          border: 1px solid transparent;
          border-radius: 8px;
          background: transparent;
          color: #64748b;
          font-size: 12px;
          font-weight: 650;
          cursor: pointer;
          transition: .18s ease;
        }

        .dash-quick-tab:hover {
          background: #f8fafc;
          color: #1e293b;
        }

        .dash-quick-tab.active {
          background: #ecfeff;
          border-color: #a5f3fc;
          color: #0e7490;
        }

        .dash-pill-num {
          padding: 2px 6px;
          border-radius: 99px;
          background: rgba(148,163,184,.15);
          font-size: 10px;
          font-weight: 750;
        }

        .dash-controls-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        .dash-search-box {
          display: flex;
          align-items: center;
          gap: 9px;
          min-width: min(340px, 100%);
          height: 38px;
          padding: 0 12px;
          border: 1px solid var(--dash-border);
          border-radius: 9px;
          background: #fff;
          color: #94a3b8;
        }

        .dash-search-box:focus-within {
          border-color: #67e8f9;
          box-shadow: 0 0 0 3px rgba(6,182,212,.10);
        }

        .dash-search-input {
          border: 0!important;
          outline: 0!important;
          box-shadow: none!important;
          width: 100%;
          min-width: 0;
          background: transparent!important;
          font-size: 12px;
          color: #1e293b;
        }

        .dash-counter-text {
          color: #64748b;
          font-size: 12px;
          white-space: nowrap;
        }

        .dash-counter-text strong {
          color: var(--dash-primary-dark);
        }

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

        /* TABLE */
        .dash-table-wrapper {
          width: 100%;
          overflow-x: auto;
          border: 1px solid var(--dash-border);
          border-radius: 11px;
        }

        .dash-table {
          width: 100%;
          min-width: 900px;
          border-collapse: collapse;
          background: #fff;
        }

        .dash-table thead th {
          padding: 12px 14px;
          color: #94a3b8;
          background: #f8fafc;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: .6px;
          text-align: left;
          white-space: nowrap;
          border-bottom: 1px solid var(--dash-border);
        }

        .dash-table tbody td {
          padding: 14px;
          color: #64748b;
          border-bottom: 1px solid #f0f3f7;
          font-size: 12px;
          vertical-align: middle;
        }

        .dash-table tbody tr {
          transition: background .15s ease;
        }

        .dash-table tbody tr:hover {
          background: #fafcfe;
        }

        .dash-table tbody tr.highlighted {
          background: #f5f3ff;
        }

        .dash-table tbody tr.selected {
          background: #ecfeff;
        }

        .dash-run-id {
          display: inline-block;
          padding: 3px 6px;
          color: #0891b2;
          background: #ecfeff;
          border: 1px solid #cffafe;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 750;
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        }

        .dash-new-badge {
          display: inline-block;
          padding: 2px 5px;
          margin-left: 6px;
          color: #7c3aed;
          background: #f5f3ff;
          border: 1px solid #ddd6fe;
          border-radius: 5px;
          font-size: 9px;
          font-weight: 800;
          text-transform: uppercase;
        }

        .dash-table-workflow {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .dash-table-workflow strong {
          color: #1e293b;
          font-size: 12px;
          font-weight: 700;
        }

        .dash-table-workflow span {
          color: #94a3b8;
          font-size: 10px;
        }

        .dash-status {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 8px;
          border-radius: 6px;
          font-size: 10px;
          font-weight: 750;
          white-space: nowrap;
          text-transform: uppercase;
          letter-spacing: .4px;
        }

        .dash-status.running {
          color: #0891b2;
          background: #ecfeff;
          border: 1px solid #cffafe;
        }

        .dash-status.completed {
          color: #059669;
          background: #ecfdf5;
          border: 1px solid #a7f3d0;
        }

        .dash-status.failed {
          color: #dc2626;
          background: #fef2f2;
          border: 1px solid #fecaca;
        }

        .dash-status.cancelled {
          color: #64748b;
          background: #f1f5f9;
          border: 1px solid #e2e8f0;
        }

        .dash-status.neutral {
          color: #64748b;
          background: #f1f5f9;
        }

        .dash-status-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: currentColor;
          animation: dash-dot-pulse 1.6s infinite ease-in-out;
        }

        .dash-progress {
          display: flex;
          align-items: center;
          gap: 8px;
          min-width: 140px;
        }

        .dash-progress-track {
          flex: 1;
          height: 6px;
          background: #edf2f7;
          border-radius: 99px;
          overflow: hidden;
        }

        .dash-progress-fill {
          height: 100%;
          border-radius: 99px;
          transition: width .3s ease;
        }

        .dash-progress-fill.running { background: #0891b2; }
        .dash-progress-fill.completed { background: #10b981; }
        .dash-progress-fill.failed { background: #ef4444; }
        .dash-progress-fill.neutral { background: #94a3b8; }

        .dash-progress span {
          color: #64748b;
          font-size: 10px;
          font-weight: 700;
          white-space: nowrap;
        }

        .dash-duration {
          font-variant-numeric: tabular-nums;
          font-weight: 650;
        }

        .dash-action-cell {
          display: flex;
          align-items: center;
          gap: 6px;
          justify-content: flex-end;
        }

        .dash-icon-btn {
          width: 30px;
          height: 30px;
          display: grid;
          place-items: center;
          color: #64748b;
          background: #fff;
          border: 1px solid var(--dash-border);
          border-radius: 8px;
          cursor: pointer;
          transition: .18s ease;
        }

        .dash-icon-btn:hover {
          color: var(--dash-primary);
          border-color: #a5f3fc;
          background: #ecfeff;
        }

        .dash-table-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px 16px;
          text-align: center;
        }

        .dash-empty-icon {
          width: 52px;
          height: 52px;
          display: grid;
          place-items: center;
          margin-bottom: 12px;
          border-radius: 12px;
          background: #ecfeff;
          color: var(--dash-primary);
        }

        .dash-table-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          padding: 14px 4px 0;
          color: #94a3b8;
          font-size: 11px;
          flex-wrap: wrap;
        }

        .dash-total-runs {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        /* MODALS */
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

        .dash-modal-lg {
          width: min(100%, 920px);
        }

        .dash-modal-head {
          position: sticky;
          top: 0;
          z-index: 2;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          padding: 20px 24px;
          background: #fff;
          border-bottom: 1px solid var(--dash-border);
        }

        .dash-modal-title-group {
          display: flex;
          align-items: center;
          gap: 14px;
          flex: 1;
          min-width: 0;
        }

        .dash-modal-icon-badge {
          width: 42px;
          height: 42px;
          display: grid;
          place-items: center;
          border-radius: 12px;
          flex-shrink: 0;
        }

        .dash-modal-icon-badge.blue { background: #eff6ff; color: #2563eb; }
        .dash-modal-icon-badge.emerald { background: #ecfdf5; color: #059669; }
        .dash-modal-icon-badge.rose { background: #fef2f2; color: #dc2626; }
        .dash-modal-icon-badge.neutral { background: #f1f5f9; color: #64748b; }

        .dash-modal-title {
          margin: 0;
          font-size: 16px;
          font-weight: 800;
          line-height: 1.35;
          color: var(--dash-text);
        }

        .dash-modal-subtitle {
          display: block;
          margin-top: 3px;
          color: var(--dash-muted);
          font-size: 11px;
        }

        .dash-modal-body {
          padding: 22px 24px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .dash-modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          flex-wrap: wrap;
          padding: 16px 24px;
          background: #f8fafc;
          border-top: 1px solid var(--dash-border);
        }

        /* AI DIAGNOSIS CARD */
        .dash-ai-diag-card {
          padding: 16px;
          background: linear-gradient(135deg, #fbf7ff 0%, #f5f3ff 100%);
          border: 1px solid #ddd6fe;
          border-radius: 12px;
          box-shadow: 0 4px 14px rgba(124,58,237,.06);
        }

        .dash-ai-diag-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
          margin-bottom: 12px;
        }

        .dash-ai-diag-title {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #6d28d9;
          font-size: 13px;
          font-weight: 800;
        }

        .dash-ai-diag-body {
          display: flex;
          flex-direction: column;
          gap: 10px;
          color: #4c1d95;
          font-size: 12px;
          line-height: 1.6;
        }

        .dash-ai-fix-box {
          margin-top: 6px;
          padding: 12px;
          background: #fff;
          border: 1px solid #c4b5fd;
          border-radius: 9px;
        }

        .dash-ai-fix-box pre {
          margin: 6px 0 0;
          font-size: 11px;
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
          white-space: pre-wrap;
          word-break: break-word;
          color: #1e1b4b;
        }

        /* META SUMMARY BANNER */
        .dash-meta-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 12px;
          padding: 14px;
          background: #f8fafc;
          border: 1px solid var(--dash-border);
          border-radius: 12px;
        }

        .dash-meta-col {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .dash-meta-lbl {
          color: #94a3b8;
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: .5px;
        }

        .dash-meta-val {
          color: #1e293b;
          font-size: 12px;
          font-weight: 750;
        }

        /* STEP TIMELINE */
        .dash-timeline {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .dash-timeline-item {
          display: flex;
          align-items: flex-start;
          gap: 14px;
          padding: 14px;
          background: #fff;
          border: 1px solid #edf2f7;
          border-radius: 11px;
          transition: border-color .15s ease;
        }

        .dash-timeline-item.done {
          border-left: 4px solid #10b981;
        }

        .dash-timeline-item.active {
          border-left: 4px solid #0891b2;
          background: #f0fdfa;
        }

        .dash-timeline-item.failed {
          border-left: 4px solid #ef4444;
          background: #fef2f2;
        }

        .dash-timeline-item.skipped {
          border-left: 4px solid #94a3b8;
        }

        .dash-timeline-item.pending {
          border-left: 4px solid #cbd5e1;
        }

        .dash-timeline-node {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: grid;
          place-items: center;
          flex-shrink: 0;
          background: #f1f5f9;
          color: #64748b;
          font-size: 11px;
          font-weight: 800;
        }

        .dash-timeline-item.done .dash-timeline-node {
          background: #ecfdf5;
          color: #059669;
        }

        .dash-timeline-item.active .dash-timeline-node {
          background: #ecfeff;
          color: #0891b2;
        }

        .dash-timeline-item.failed .dash-timeline-node {
          background: #fee2e2;
          color: #dc2626;
        }

        .dash-timeline-content {
          flex: 1;
          min-width: 0;
        }

        .dash-timeline-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
          margin-bottom: 6px;
        }

        .dash-timeline-title {
          margin: 0;
          font-size: 13px;
          font-weight: 750;
          color: #1e293b;
        }

        .dash-timeline-meta {
          display: flex;
          align-items: center;
          gap: 14px;
          flex-wrap: wrap;
          font-size: 11px;
          color: #64748b;
        }

        .dash-timeline-meta code {
          padding: 2px 5px;
          background: #f1f5f9;
          border-radius: 4px;
          font-size: 10px;
          color: #334155;
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        }

        .dash-code-block {
          padding: 12px 14px;
          background: #0f172a;
          color: #f8fafc;
          border-radius: 10px;
          font-size: 11px;
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
          line-height: 1.5;
          overflow-x: auto;
          max-height: 240px;
        }

        /* RESPONSIVE */
        @media (max-width: 1000px) {
          .dash-stats-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          .dash-meta-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
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
          .dash-meta-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      {/* =====================================
          PAGE HEADER
      ===================================== */}
      <header className="dash-page-header">
        <div>
          <div className="dash-eyebrow">
            <span className="dash-live-dot pulse" />
            EXECUTION LIFECYCLE & WORKER DISPATCH
          </div>
          <h1>Lượt Chạy Phân Tán (Executions)</h1>
          <p>
            Theo dõi vòng đời thực thi DAG, dispatch tác vụ worker và chẩn đoán sự cố tự động bằng AI.
          </p>
        </div>

        <div className="dash-header-actions">
          <button
            type="button"
            className="dash-btn dash-btn-outline"
            disabled={refreshing}
            onClick={handleManualRefresh}
            title="Đồng bộ ngay lập tức từ Orchestrator"
          >
            <I name="rotate-cw" size={15} className={refreshing ? "dash-spin" : ""} />
            {refreshing ? "Đang đồng bộ..." : "Làm mới dữ liệu"}
          </button>

          <button
            type="button"
            className="dash-btn dash-btn-primary"
            onClick={() => nav("/workflows")}
          >
            <I name="plus" size={15} />
            Kích Hoạt Workflow
          </button>
        </div>
      </header>

      {/* =====================================
          KPI METRICS
      ===================================== */}
      <section className="dash-stats-grid">
        <StatCard
          icon="activity"
          label="Tổng Lượt Chạy"
          value={totalRuns}
          description="Tất cả lượt thực thi ghi nhận"
          variant="blue"
          footer={
            <span className="dash-mini-badge">
              {completed} thành công
            </span>
          }
        />

        <StatCard
          icon="play"
          label="Đang Thực Thi"
          value={running}
          description="Worker đang xử lý tác vụ"
          variant="cyan"
          footer={
            <span className="dash-mini-badge">
              {running > 0 ? "Đang xử lý tích cực" : "Không có task chờ"}
            </span>
          }
        />

        <StatCard
          icon="pie-chart"
          label="Tỷ Lệ Thành Công"
          value={successRate === null ? "—" : `${successRate}%`}
          description="Dựa trên lượt chạy đã hoàn tất"
          variant="purple"
          footer={
            <span className="dash-mini-badge">
              {completed} hoàn thành
            </span>
          }
        />

        <StatCard
          icon="triangle-alert"
          label="Lỗi & Hủy Bỏ"
          value={failed + statusCounts.CANCELLED}
          description="Lượt chạy gián đoạn / timeout"
          variant="orange"
          footer={
            <span className="dash-mini-badge">
              {failed} lỗi • {statusCounts.CANCELLED} hủy
            </span>
          }
        />
      </section>

      {/* =====================================
          MAIN EXECUTIONS PANEL
      ===================================== */}
      <section className="dash-panel">
        <SectionHeader
          title="Lịch Sử Thực Thi (Execution Trace)"
          subtitle="Cập nhật theo thời gian thực mỗi 2 giây từ Orchestrator."
          action={
            <span className="dash-cluster-status">
              <span className="dash-live-dot pulse" />
              Live Polling (2s)
            </span>
          }
        />

        {/* Toolbar & Filter Tabs */}
        <div className="dash-toolbar-wrap">
          <div className="dash-quick-tabs">
            {[
              { key: "ALL", label: "Tất cả" },
              { key: "RUNNING", label: "Đang chạy" },
              { key: "COMPLETED", label: "Thành công" },
              { key: "FAILED", label: "Lỗi" },
              { key: "CANCELLED", label: "Đã hủy" },
            ].map(({ key, label }) => (
              <button
                key={key}
                type="button"
                className={`dash-quick-tab ${filterStatus === key ? "active" : ""}`}
                onClick={() => setFilterStatus(key)}
              >
                <span>{label}</span>
                <span className="dash-pill-num">{statusCounts[key] || 0}</span>
              </button>
            ))}
          </div>

          <div className="dash-controls-row">
            <div className="dash-search-box">
              <I name="search" size={15} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm theo Run ID (#12) hoặc Tên Workflow..."
                className="dash-search-input"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  style={{ border: "none", background: "transparent", cursor: "pointer", color: "#94a3b8" }}
                >
                  <I name="x" size={13} />
                </button>
              )}
            </div>

            <span className="dash-counter-text">
              Hiển thị <strong>{filtered.length}</strong> / {executions.length} lượt chạy
            </span>
          </div>
        </div>

        {/* Executions Table */}
        <div className="dash-table-wrapper">
          <table className="dash-table">
            <thead>
              <tr>
                <th style={{ width: "110px" }}>RUN ID</th>
                <th>WORKFLOW</th>
                <th>STATUS</th>
                <th>TIẾN TRÌNH STEP</th>
                <th>BẮT ĐẦU</th>
                <th>THỜI LƯỢNG</th>
                <th style={{ textAlign: "right" }}>THAO TÁC</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((ex) => {
                const tasks = ex.tasks || [];
                const totalSteps = tasks.length;
                const completedSteps = tasks.filter((t) =>
                  ["COMPLETED", "SUCCESS"].includes(String(t.status).toUpperCase())
                ).length;
                const pct = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
                const statusClass = getStatusClass(ex.status);
                const isRunning = statusClass === "running";
                const isHighlighted = highlightId && (ex.id === Number(highlightId) || ex.id === highlightId);

                return (
                  <tr
                    key={ex.id}
                    className={`${activeEx?.id === ex.id ? "selected" : ""} ${isHighlighted ? "highlighted" : ""}`}
                    onClick={() => {
                      setSelectedEx(ex);
                      setAiDiagnosis(null);
                    }}
                    style={{ cursor: "pointer" }}
                  >
                    <td>
                      <div style={{ display: "flex", alignItems: "center" }}>
                        <code className="dash-run-id">#{ex.id}</code>
                        {isHighlighted && <span className="dash-new-badge">Mới</span>}
                      </div>
                    </td>

                    <td>
                      <div className="dash-table-workflow">
                        <strong>{ex.workflowName || "Unknown Workflow"}</strong>
                        <span>Version {ex.version || 1}</span>
                      </div>
                    </td>

                    <td>
                      <span className={`dash-status ${statusClass}`}>
                        {isRunning && <span className="dash-status-dot" />}
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
                          {completedSteps}/{totalSteps} ({pct}%)
                        </span>
                      </div>
                    </td>

                    <td>{formatDate(ex.startedAt || ex.createdAt)}</td>

                    <td className="dash-duration">
                      {formatDuration(ex.startedAt || ex.createdAt, ex.completedAt)}
                    </td>

                    <td onClick={(e) => e.stopPropagation()}>
                      <div className="dash-action-cell">
                        {ex.status === "RUNNING" && can("executionCancel") && (
                          <button
                            type="button"
                            className="dash-btn dash-btn-danger dash-btn-xs"
                            onClick={() => cancelExecution(ex.id)}
                            title="Hủy bỏ lượt chạy"
                          >
                            <I name="x" size={12} /> Hủy run
                          </button>
                        )}
                        <button
                          type="button"
                          className="dash-icon-btn"
                          title="Xem chi tiết lượt chạy"
                          onClick={() => {
                            setSelectedEx(ex);
                            setAiDiagnosis(null);
                          }}
                        >
                          <I name="arrow-right" size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7}>
                    <div className="dash-table-empty">
                      <div className="dash-empty-icon">
                        <I name="layers" size={26} />
                      </div>
                      <h3 style={{ margin: "0 0 6px", fontSize: "14px", fontWeight: "700" }}>
                        {filterStatus === "RUNNING"
                          ? "Không có lượt chạy nào đang xử lý"
                          : "Không tìm thấy lượt chạy phù hợp"}
                      </h3>
                      <p style={{ margin: "0 0 16px", color: "var(--dash-muted)", fontSize: "12px" }}>
                        {filterStatus === "RUNNING" && completed > 0
                          ? `Hệ thống đã hoàn tất thành công ${completed} lượt chạy trước đó.`
                          : "Thử thay đổi bộ lọc trạng thái hoặc từ khóa tìm kiếm."}
                      </p>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <button
                          type="button"
                          className="dash-btn dash-btn-outline dash-btn-xs"
                          onClick={() => {
                            setFilterStatus("ALL");
                            setSearchQuery("");
                          }}
                        >
                          Xem tất cả ({statusCounts.ALL})
                        </button>
                        {completed > 0 && (
                          <button
                            type="button"
                            className="dash-btn dash-btn-primary dash-btn-xs"
                            onClick={() => {
                              setFilterStatus("COMPLETED");
                              setSearchQuery("");
                            }}
                          >
                            Xem đã hoàn thành ({completed})
                          </button>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer */}
        <div className="dash-table-footer">
          <span>
            Đang hiển thị {filtered.length} / {executions.length} lượt thực thi
          </span>
          <span className="dash-total-runs">
            <I name="activity" size={14} />
            {totalRuns} lượt chạy ghi nhận trong hệ thống
          </span>
        </div>
      </section>

      {/* =====================================
          EXECUTION DETAIL MODAL
      ===================================== */}
      {activeEx && (
        <div className="dash-modal-backdrop" onClick={handleCloseModal}>
          <div className="dash-modal dash-modal-lg" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="dash-modal-head">
              <div className="dash-modal-title-group">
                <div
                  className={`dash-modal-icon-badge ${
                    activeEx.status === "RUNNING"
                      ? "blue"
                      : activeEx.status === "COMPLETED"
                      ? "emerald"
                      : activeEx.status === "FAILED"
                      ? "rose"
                      : "neutral"
                  }`}
                >
                  <I
                    name={
                      activeEx.status === "COMPLETED"
                        ? "check-circle"
                        : activeEx.status === "RUNNING"
                        ? "play"
                        : activeEx.status === "FAILED"
                        ? "triangle-alert"
                        : "activity"
                    }
                    size={20}
                  />
                </div>
                <div>
                  <h3 className="dash-modal-title">
                    Chi Tiết Lượt Chạy #{activeEx.id}
                  </h3>
                  <span className="dash-modal-subtitle">
                    {activeEx.workflowName} (v{activeEx.version}) • Khởi tạo: {formatDate(activeEx.createdAt)}
                  </span>
                </div>
              </div>

              <div className="dash-header-actions">
                {activeEx.status === "FAILED" && (
                  <button
                    type="button"
                    className="dash-btn dash-btn-ai dash-btn-xs"
                    onClick={() => handleAiDiagnose(activeEx.id)}
                    disabled={diagnosing}
                  >
                    <I name="sparkles" size={13} />
                    <span>{diagnosing ? "AI đang chẩn đoán..." : "AI Chẩn Đoán Lỗi"}</span>
                  </button>
                )}

                {activeEx.status === "RUNNING" && can("executionCancel") && (
                  <button
                    type="button"
                    className="dash-btn dash-btn-danger dash-btn-xs"
                    onClick={() => cancelExecution(activeEx.id)}
                  >
                    Hủy lượt chạy
                  </button>
                )}

                <button
                  type="button"
                  className="dash-icon-btn"
                  onClick={handleCloseModal}
                  title="Đóng cửa sổ này (ESC)"
                >
                  <I name="x" size={16} />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="dash-modal-body">
              {/* AI Diagnosis Result Box */}
              {aiDiagnosis && (
                <div className="dash-ai-diag-card">
                  <div className="dash-ai-diag-head">
                    <div className="dash-ai-diag-title">
                      <I name="sparkles" size={17} />
                      <strong>Báo Cáo Chẩn Đoán Của AI Assistant (9Router)</strong>
                    </div>
                    <span
                      className={`dash-mini-badge ${
                        aiDiagnosis.severity === "HIGH" ? "danger" : "warning"
                      }`}
                      style={{
                        background: aiDiagnosis.severity === "HIGH" ? "#fee2e2" : "#fef3c7",
                        color: aiDiagnosis.severity === "HIGH" ? "#dc2626" : "#b45309",
                      }}
                    >
                      {aiDiagnosis.severity} SEVERITY
                    </span>
                  </div>

                  <div className="dash-ai-diag-body">
                    <div>
                      <strong>Nguyên nhân cốt lõi (Root Cause):</strong> {aiDiagnosis.rootCause}
                    </div>

                    <div className="dash-ai-fix-box">
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: "11px", fontWeight: "700", color: "#6d28d9" }}>
                          Khuyến nghị tự phục hồi (Self-Healing Action):
                        </span>
                        <button
                          type="button"
                          className="dash-btn dash-btn-outline dash-btn-xs"
                          onClick={() => {
                            navigator.clipboard.writeText(aiDiagnosis.suggestedFix);
                            toast("Đã sao chép giải pháp khắc phục!", "success");
                          }}
                        >
                          <I name="copy" size={12} /> Sao chép
                        </button>
                      </div>
                      <pre>{aiDiagnosis.suggestedFix}</pre>
                    </div>
                  </div>
                </div>
              )}

              {/* Status & Metadata Banner */}
              <div className="dash-meta-grid">
                <div className="dash-meta-col">
                  <span className="dash-meta-lbl">Trạng thái</span>
                  <div className="dash-meta-val">
                    <span className={`dash-status ${getStatusClass(activeEx.status)}`}>
                      {activeEx.status === "RUNNING" && <span className="dash-status-dot" />}
                      {activeEx.status}
                    </span>
                  </div>
                </div>

                <div className="dash-meta-col">
                  <span className="dash-meta-lbl">Tổng Steps DAG</span>
                  <div className="dash-meta-val">
                    {activeEx.tasks?.length || 0} tác vụ
                  </div>
                </div>

                <div className="dash-meta-col">
                  <span className="dash-meta-lbl">Thời lượng</span>
                  <div className="dash-meta-val dash-duration">
                    {formatDuration(activeEx.startedAt || activeEx.createdAt, activeEx.completedAt)}
                  </div>
                </div>

                <div className="dash-meta-col">
                  <span className="dash-meta-lbl">Instance ID</span>
                  <div className="dash-meta-val">
                    <code className="dash-run-id">instance-{activeEx.id}</code>
                  </div>
                </div>
              </div>

              {/* Step Timeline */}
              <div>
                <h4 style={{ margin: "0 0 12px", fontSize: "13px", fontWeight: "800", color: "#1e293b" }}>
                  Tiến trình từng bước (Step-by-Step Task Lifecycle):
                </h4>

                <div className="dash-timeline">
                  {(activeEx.tasks || []).map((t, idx) => {
                    const statusVal = String(t.status || "").toUpperCase();
                    const isDone = ["COMPLETED", "SUCCESS"].includes(statusVal);
                    const isRun = statusVal === "RUNNING";
                    const isFail = ["FAILED", "TIMEOUT"].includes(statusVal);
                    const isSkipped = statusVal === "SKIPPED";

                    const itemClass = isDone
                      ? "done"
                      : isRun
                      ? "active"
                      : isFail
                      ? "failed"
                      : isSkipped
                      ? "skipped"
                      : "pending";

                    return (
                      <div key={t.id || t.stepId || idx} className={`dash-timeline-item ${itemClass}`}>
                        <div className="dash-timeline-node">
                          {isDone ? (
                            <I name="check" size={15} />
                          ) : isRun ? (
                            <span className="dash-status-dot" />
                          ) : isFail ? (
                            <I name="x" size={15} />
                          ) : (
                            <span>{idx + 1}</span>
                          )}
                        </div>

                        <div className="dash-timeline-content">
                          <div className="dash-timeline-header">
                            <h5 className="dash-timeline-title">
                              {t.stepName || t.stepId}
                            </h5>
                            <span className={`dash-status ${getStatusClass(t.status)}`}>
                              {isRun && <span className="dash-status-dot" />}
                              {t.status}
                            </span>
                          </div>

                          <div className="dash-timeline-meta">
                            <span>
                              Queue: <code>{t.queueName || "default"}</code>
                            </span>
                            {t.assignedWorkerId && (
                              <span>
                                Worker: <code>{t.assignedWorkerId}</code>
                              </span>
                            )}
                            {t.retryCount !== undefined && (
                              <span>
                                Retries: <strong>{t.retryCount}</strong>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Input Payload */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <h4 style={{ margin: 0, fontSize: "13px", fontWeight: "800", color: "#1e293b" }}>
                    Input Payload (JSON):
                  </h4>
                  <button
                    type="button"
                    className="dash-btn dash-btn-outline dash-btn-xs"
                    onClick={() => {
                      navigator.clipboard.writeText(activeEx.inputPayloadJson || "{}");
                      toast("Đã copy Input Payload!", "success");
                    }}
                  >
                    <I name="copy" size={12} /> Sao chép JSON
                  </button>
                </div>
                <pre className="dash-code-block">{activeEx.inputPayloadJson || "{}"}</pre>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="dash-modal-actions">
              <button
                type="button"
                className="dash-btn dash-btn-outline"
                onClick={handleCloseModal}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
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
