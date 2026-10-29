import { useState } from "react";
import { useFinance } from "../../../lib/store";
import { I } from "../../../lib/icons";
import { api } from "../../../lib/api";

export default function ExecutionsPage() {
  const { executions, cancelExecution, can, toast } = useFinance();
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [selectedEx, setSelectedEx] = useState(null);
  const [aiDiagnosis, setAiDiagnosis] = useState(null);
  const [diagnosing, setDiagnosing] = useState(false);

  const filtered = executions.filter((e) => {
    if (filterStatus === "ALL") return true;
    return e.status === filterStatus;
  });

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

  const statusCounts = {
    ALL: executions.length,
    RUNNING: executions.filter((e) => e.status === "RUNNING").length,
    COMPLETED: executions.filter((e) => e.status === "COMPLETED").length,
    FAILED: executions.filter((e) => e.status === "FAILED").length,
    CANCELLED: executions.filter((e) => e.status === "CANCELLED").length,
  };

  return (
    <div className="orch-page-wrap">
      {/* Header */}
      <div className="orch-page-header">
        <div>
          <h2 className="orch-page-heading">Lượt Chạy Phân Tán (Executions)</h2>
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

                return (
                  <tr
                    key={ex.id}
                    className={`orch-table-row ${selectedEx?.id === ex.id ? "selected" : ""}`}
                    onClick={() => {
                      setSelectedEx(ex);
                      setAiDiagnosis(null);
                    }}
                    style={{ cursor: "pointer" }}
                  >
                    <td><code className="orch-code-pill">#{ex.id}</code></td>
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
                        <span className="orch-step-count">{completedSteps}/{totalSteps} steps</span>
                      </div>
                    </td>
                    <td><span className="orch-cell-time">{new Date(ex.createdAt).toLocaleTimeString()}</span></td>
                    <td><span className="orch-cell-time">{ex.completedAt ? new Date(ex.completedAt).toLocaleTimeString() : isRunning ? "Đang xử lý..." : "—"}</span></td>
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
                    <div className="orch-empty-state">
                      <I name="inbox" size={32} />
                      <p>Không tìm thấy lượt chạy nào với bộ lọc này.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Execution Detail Modal / Drawer */}
      {selectedEx && (
        <div className="orch-modal-backdrop" onClick={() => setSelectedEx(null)}>
          <div className="orch-modal orch-modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="orch-modal-head">
              <div className="orch-modal-title-group">
                <div className={`orch-modal-icon-badge ${selectedEx.status === "RUNNING" ? "blue" : selectedEx.status === "COMPLETED" ? "emerald" : "rose"}`}>
                  <I name={selectedEx.status === "COMPLETED" ? "check-circle" : selectedEx.status === "RUNNING" ? "play" : "triangle-alert"} size={18} />
                </div>
                <div>
                  <h3 className="orch-modal-title">Chi Tiết Lượt Chạy #{selectedEx.id}</h3>
                  <span className="orch-modal-subtitle">
                    {selectedEx.workflowName} (v{selectedEx.version}) • Khởi tạo: {new Date(selectedEx.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="orch-header-actions">
                {selectedEx.status === "FAILED" && (
                  <button
                    className="orch-btn orch-btn-ai orch-btn-sm"
                    onClick={() => handleAiDiagnose(selectedEx.id)}
                    disabled={diagnosing}
                  >
                    <I name="sparkles" size={14} />
                    <span>{diagnosing ? "AI đang chẩn đoán..." : "AI Chẩn Đoán Lỗi"}</span>
                  </button>
                )}
                {selectedEx.status === "RUNNING" && can("executionCancel") && (
                  <button
                    className="orch-btn orch-btn-danger orch-btn-sm"
                    onClick={() => {
                      cancelExecution(selectedEx.id);
                      setSelectedEx(null);
                    }}
                  >
                    Hủy lượt chạy
                  </button>
                )}
                <button className="orch-icon-btn" onClick={() => setSelectedEx(null)}><I name="x" size={18} /></button>
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
                    <span className={`orch-badge-status ${selectedEx.status === "RUNNING" ? "running" : selectedEx.status === "COMPLETED" ? "completed" : "failed"}`}>
                      {selectedEx.status}
                    </span>
                  </span>
                </div>
                <div className="orch-meta-item">
                  <span className="orch-meta-label">Tổng Steps DAG</span>
                  <span className="orch-meta-val">{selectedEx.tasks?.length || 0} tác vụ</span>
                </div>
                <div className="orch-meta-item">
                  <span className="orch-meta-label">ID Tiến trình</span>
                  <span className="orch-meta-val"><code>instance-{selectedEx.id}</code></span>
                </div>
              </div>

              {/* Step Timeline */}
              <h4 className="orch-section-heading">Tiến trình từng bước (Step-by-Step Task Lifecycle):</h4>
              <div className="orch-step-timeline">
                {(selectedEx.tasks || []).map((t, idx) => {
                  const isDone = t.status === "COMPLETED";
                  const isRun = t.status === "RUNNING";
                  const isFail = t.status === "FAILED";
                  return (
                    <div key={t.id || t.stepId} className={`orch-timeline-item ${isDone ? "done" : isRun ? "active" : isFail ? "failed" : "pending"}`}>
                      <div className="orch-timeline-node">
                        {isDone ? <I name="check" size={13} /> : isRun ? <span className="orch-pulse-dot" /> : isFail ? <I name="x" size={13} /> : <span>{idx + 1}</span>}
                      </div>
                      <div className="orch-timeline-body">
                        <div className="orch-timeline-header">
                          <strong className="orch-step-name">{t.stepName || t.stepId}</strong>
                          <span className={`orch-badge-status ${isDone ? "completed" : isRun ? "running" : isFail ? "failed" : "neutral"}`}>
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
              <pre className="orch-code-block">{selectedEx.inputPayloadJson || "{}"}</pre>
            </div>

            <div className="orch-modal-actions">
              <button className="orch-btn orch-btn-secondary" onClick={() => setSelectedEx(null)}>Đóng</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
