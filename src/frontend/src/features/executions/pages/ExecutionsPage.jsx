import { useState, useEffect, useMemo, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useFinance } from "../../../lib/store";
import { I } from "../../../lib/icons";
import { api } from "../../../lib/api";

export default function ExecutionsPage() {
  const { executions, cancelExecution, can, toast, loadExecutions } = useFinance();
  const location = useLocation();
  const highlightId = location.state?.highlightId;

  const [filterStatus, setFilterStatus] = useState("ALL");
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

  const filtered = useMemo(() => {
    return executions.filter((e) => {
      if (filterStatus === "ALL") return true;
      return e.status === filterStatus;
    });
  }, [executions, filterStatus]);

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

  const statusCounts = useMemo(() => ({
    ALL: executions.length,
    RUNNING: executions.filter((e) => e.status === "RUNNING").length,
    COMPLETED: executions.filter((e) => e.status === "COMPLETED").length,
    FAILED: executions.filter((e) => e.status === "FAILED").length,
    CANCELLED: executions.filter((e) => e.status === "CANCELLED").length,
  }), [executions]);

  return (
    <div className="orch-page-wrap">
      {/* Header */}
      <div className="orch-page-header">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
            <h2 className="orch-page-heading" style={{ margin: 0 }}>Lượt Chạy Phân Tán (Executions)</h2>
            <button
              type="button"
              className="orch-btn orch-btn-ghost orch-btn-xs"
              onClick={handleManualRefresh}
              disabled={refreshing}
              title="Đồng bộ ngay lập tức từ Orchestrator"
            >
              <I name="rotate-cw" size={12} className={refreshing ? "orch-spin" : ""} />
              <span>{refreshing ? "Đang tải..." : "Làm mới"}</span>
            </button>
          </div>
          <p className="orch-page-sub">
            Theo dõi vòng đời thực thi DAG, dispatch tác vụ worker và chẩn đoán sự cố tự động bằng AI
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="orch-filter-tabs">
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
              className={`orch-filter-tab ${filterStatus === key ? "active" : ""}`}
              onClick={() => setFilterStatus(key)}
            >
              <span>{label}</span>
              <span className="orch-tab-count">{statusCounts[key] || 0}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Execution Content: Table & Detail Drawer */}
      <div className="orch-card">
        <div className="orch-table-container">
          <table className="orch-table">
            <thead>
              <tr>
                <th style={{ width: "90px" }}>Run ID</th>
                <th>Tên Workflow</th>
                <th>Trạng thái</th>
                <th>Tiến trình Step</th>
                <th>Bắt đầu</th>
                <th>Kết thúc</th>
                <th style={{ textAlign: "right" }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((ex) => {
                const totalSteps = ex.tasks?.length || 0;
                const completedSteps = ex.tasks?.filter((t) => t.status === "COMPLETED").length || 0;
                const pct = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
                const isRunning = ex.status === "RUNNING";
                const isCompleted = ex.status === "COMPLETED";
                const isFailed = ex.status === "FAILED";
                const isHighlighted = highlightId && (ex.id === Number(highlightId) || ex.id === highlightId);

                return (
                  <tr
                    key={ex.id}
                    className={`orch-table-row ${activeEx?.id === ex.id ? "selected" : ""} ${isHighlighted ? "highlighted" : ""}`}
                    onClick={() => {
                      setSelectedEx(ex);
                      setAiDiagnosis(null);
                    }}
                    style={{ cursor: "pointer" }}
                  >
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <code className="orch-code-pill">#{ex.id}</code>
                        {isHighlighted && (
                          <span className="orch-tag purple" style={{ fontSize: "0.62rem", padding: "1px 5px" }}>Mới</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="orch-cell-workflow">
                        <strong className="orch-cell-wfname">{ex.workflowName}</strong>
                        <span className="orch-cell-wfver">v{ex.version}</span>
                      </div>
                    </td>
                    <td>
                      <span className={`orch-badge-status ${isRunning ? "running" : isCompleted ? "completed" : isFailed ? "failed" : "neutral"}`}>
                        {isRunning && <span className="orch-pulse-dot" />}
                        {ex.status}
                      </span>
                    </td>
                    <td>
                      <div className="orch-step-progress">
                        <div className="orch-progress-track">
                          <div
                            className={`orch-progress-fill ${isCompleted ? "completed" : isFailed ? "failed" : "running"}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="orch-step-count">{completedSteps}/{totalSteps} steps ({pct}%)</span>
                      </div>
                    </td>
                    <td>
                      <span className="orch-cell-time">
                        {ex.startedAt ? new Date(ex.startedAt).toLocaleTimeString() : ex.createdAt ? new Date(ex.createdAt).toLocaleTimeString() : "—"}
                      </span>
                    </td>
                    <td>
                      <span className="orch-cell-time">
                        {ex.completedAt ? new Date(ex.completedAt).toLocaleTimeString() : isRunning ? "Đang xử lý..." : "—"}
                      </span>
                    </td>
                    <td style={{ textAlign: "right" }} onClick={(e) => e.stopPropagation()}>
                      <div className="orch-btn-group-right">
                        {ex.status === "RUNNING" && can("executionCancel") && (
                          <button
                            className="orch-btn orch-btn-danger orch-btn-xs"
                            onClick={() => cancelExecution(ex.id)}
                            title="Hủy bỏ lượt chạy"
                          >
                            <I name="x" size={12} /> Hủy run
                          </button>
                        )}
                        <button
                          className="orch-btn orch-btn-ghost orch-btn-xs"
                          onClick={() => {
                            setSelectedEx(ex);
                            setAiDiagnosis(null);
                          }}
                        >
                          <I name="eye" size={12} /> Chi tiết
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="orch-empty-cell">
                    <div className="orch-empty-state" style={{ padding: "36px 16px", textAlign: "center" }}>
                      <div style={{ display: "inline-flex", padding: "12px", borderRadius: "50%", background: "var(--bg-subtle)", marginBottom: "12px", color: "var(--text-muted)" }}>
                        <I name="git-fork" size={28} />
                      </div>
                      <p style={{ margin: "0 0 10px", fontSize: "0.92rem", fontWeight: 600, color: "var(--text-primary)" }}>
                        {filterStatus === "RUNNING"
                          ? "Không có lượt chạy nào đang trong trạng thái Đang chạy."
                          : "Không tìm thấy lượt chạy nào với bộ lọc này."}
                      </p>
                      {filterStatus === "RUNNING" && statusCounts.COMPLETED > 0 && (
                        <p style={{ margin: "0 0 16px", fontSize: "0.82rem", color: "var(--text-secondary)" }}>
                          Các lượt chạy trước đó đã hoàn thành thành công ({statusCounts.COMPLETED} lượt chạy).
                        </p>
                      )}
                      <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
                        <button
                          type="button"
                          className="orch-btn orch-btn-secondary orch-btn-xs"
                          onClick={() => setFilterStatus("ALL")}
                        >
                          Xem Tất Cả ({statusCounts.ALL})
                        </button>
                        {statusCounts.COMPLETED > 0 && (
                          <button
                            type="button"
                            className="orch-btn orch-btn-primary orch-btn-xs"
                            onClick={() => setFilterStatus("COMPLETED")}
                          >
                            Xem Đã Hoàn Thành ({statusCounts.COMPLETED})
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
      </div>

      {/* Execution Detail Modal / Drawer */}
      {activeEx && (
        <div className="orch-modal-backdrop" onClick={handleCloseModal}>
          <div className="orch-modal orch-modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="orch-modal-head">
              <div className="orch-modal-title-group">
                <div className={`orch-modal-icon-badge ${activeEx.status === "RUNNING" ? "blue" : activeEx.status === "COMPLETED" ? "emerald" : "rose"}`}>
                  <I name={activeEx.status === "COMPLETED" ? "check-circle" : activeEx.status === "RUNNING" ? "play" : "triangle-alert"} size={18} />
                </div>
                <div>
                  <h3 className="orch-modal-title">Chi Tiết Lượt Chạy #{activeEx.id}</h3>
                  <span className="orch-modal-subtitle">
                    {activeEx.workflowName} (v{activeEx.version}) • Khởi tạo: {activeEx.createdAt ? new Date(activeEx.createdAt).toLocaleString() : "—"}
                  </span>
                </div>
              </div>

              <div className="orch-header-actions">
                {activeEx.status === "FAILED" && (
                  <button
                    className="orch-btn orch-btn-ai orch-btn-sm"
                    onClick={() => handleAiDiagnose(activeEx.id)}
                    disabled={diagnosing}
                  >
                    <I name="sparkles" size={14} />
                    <span>{diagnosing ? "AI đang chẩn đoán..." : "AI Chẩn Đoán Lỗi"}</span>
                  </button>
                )}
                {activeEx.status === "RUNNING" && can("executionCancel") && (
                  <button
                    className="orch-btn orch-btn-danger orch-btn-sm"
                    onClick={() => cancelExecution(activeEx.id)}
                  >
                    Hủy lượt chạy
                  </button>
                )}
                <button
                  type="button"
                  className="orch-icon-btn"
                  onClick={handleCloseModal}
                  title="Đóng cửa sổ này (ESC)"
                >
                  <I name="x" size={18} />
                </button>
              </div>
            </div>

            <div className="orch-modal-body">
              {/* AI Diagnosis Result Box */}
              {aiDiagnosis && (
                <div className="orch-ai-diag-card">
                  <div className="orch-ai-diag-header">
                    <div className="orch-ai-diag-title">
                      <I name="sparkles" size={16} />
                      <strong>Báo Cáo Chẩn Đoán Của AI Assistant</strong>
                    </div>
                    <span className={`orch-tag ${aiDiagnosis.severity === "HIGH" ? "danger" : "warning"}`}>
                      {aiDiagnosis.severity} SEVERITY
                    </span>
                  </div>
                  <div className="orch-ai-diag-content">
                    <p><strong>Nguyên nhân cốt lõi (Root Cause):</strong> {aiDiagnosis.rootCause}</p>
                    <div className="orch-ai-fix-box">
                      <span className="orch-fix-label">Khuyến nghị tự phục hồi (Self-Healing Action):</span>
                      <pre>{aiDiagnosis.suggestedFix}</pre>
                    </div>
                  </div>
                </div>
              )}

              {/* Status Banner */}
              <div className="orch-meta-banner">
                <div className="orch-meta-item">
                  <span className="orch-meta-label">Trạng thái</span>
                  <span className="orch-meta-val">
                    <span className={`orch-badge-status ${activeEx.status === "RUNNING" ? "running" : activeEx.status === "COMPLETED" ? "completed" : activeEx.status === "CANCELLED" ? "neutral" : "failed"}`}>
                      {activeEx.status === "RUNNING" && <span className="orch-pulse-dot" />}
                      {activeEx.status}
                    </span>
                  </span>
                </div>
                <div className="orch-meta-item">
                  <span className="orch-meta-label">Tổng Steps DAG</span>
                  <span className="orch-meta-val">{activeEx.tasks?.length || 0} tác vụ</span>
                </div>
                <div className="orch-meta-item">
                  <span className="orch-meta-label">ID Tiến trình</span>
                  <span className="orch-meta-val"><code>instance-{activeEx.id}</code></span>
                </div>
              </div>

              {/* Step Timeline */}
              <h4 className="orch-section-heading">Tiến trình từng bước (Step-by-Step Task Lifecycle):</h4>
              <div className="orch-step-timeline">
                {(activeEx.tasks || []).map((t, idx) => {
                  const isDone = t.status === "COMPLETED";
                  const isRun = t.status === "RUNNING";
                  const isFail = t.status === "FAILED";
                  const isSkipped = t.status === "SKIPPED";
                  return (
                    <div key={t.id || t.stepId} className={`orch-timeline-item ${isDone ? "done" : isRun ? "active" : isFail ? "failed" : isSkipped ? "skipped" : "pending"}`}>
                      <div className="orch-timeline-node">
                        {isDone ? <I name="check" size={13} /> : isRun ? <span className="orch-pulse-dot" /> : isFail ? <I name="x" size={13} /> : <span>{idx + 1}</span>}
                      </div>
                      <div className="orch-timeline-body">
                        <div className="orch-timeline-header">
                          <strong className="orch-step-name">{t.stepName || t.stepId}</strong>
                          <span className={`orch-badge-status ${isDone ? "completed" : isRun ? "running" : isFail ? "failed" : isSkipped ? "neutral" : "neutral"}`}>
                            {isRun && <span className="orch-pulse-dot" />}
                            {t.status}
                          </span>
                        </div>
                        <div className="orch-timeline-meta">
                          <span>Queue: <code className="orch-code-inline">{t.queueName || "default"}</code></span>
                          {t.assignedWorkerId && <span>Worker: <code className="orch-code-inline">{t.assignedWorkerId}</code></span>}
                          {t.retryCount !== undefined && <span>Retries: <strong>{t.retryCount}</strong></span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Payload Accordion */}
              <h4 className="orch-section-heading" style={{ marginTop: "24px" }}>Input Payload:</h4>
              <pre className="orch-code-block">{activeEx.inputPayloadJson || "{}"}</pre>
            </div>

            <div className="orch-modal-actions">
              <button
                type="button"
                className="orch-btn orch-btn-secondary"
                onClick={handleCloseModal}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
