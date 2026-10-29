import { useState } from "react";
import { useFinance } from "../lib/store";
import { I } from "../lib/icons";
import { api } from "../lib/api";

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
      toast("AI đã chẩn đoán xong nguyên nhân lỗi!", "success");
    } catch (err) {
      toast(err.message || "Lỗi chẩn đoán AI", "danger");
    } finally {
      setDiagnosing(false);
    }
  };

  return (
    <div className="executions-page">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: "700" }}>Workflow Executions (Lượt Chạy)</h2>
          <p style={{ margin: "4px 0 0 0", color: "#64748b", fontSize: "0.875rem" }}>
            Trạng thái thời gian thực và lịch sử thực thi của các tác vụ phân tán
          </p>
        </div>

        {/* Filter Tabs */}
        <div style={{ display: "flex", gap: "6px", backgroundColor: "#f1f5f9", padding: "4px", borderRadius: "8px" }}>
          {["ALL", "RUNNING", "COMPLETED", "FAILED", "CANCELLED"].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setFilterStatus(st)}
              style={{
                border: "none",
                padding: "6px 12px",
                borderRadius: "6px",
                fontSize: "0.8rem",
                fontWeight: "600",
                cursor: "pointer",
                backgroundColor: filterStatus === st ? "#fff" : "transparent",
                color: filterStatus === st ? "#1e293b" : "#64748b",
                boxShadow: filterStatus === st ? "0 1px 2px rgba(0,0,0,0.05)" : "none",
              }}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: selectedEx ? "1fr 1fr" : "1fr", gap: "24px" }}>
        {/* Table of Executions */}
        <div className="card" style={{ padding: "16px" }}>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Workflow</th>
                  <th>Trạng thái</th>
                  <th>Thời gian</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((ex) => {
                  const isSelected = selectedEx?.id === ex.id;
                  return (
                    <tr
                      key={ex.id}
                      onClick={() => { setSelectedEx(ex); setAiDiagnosis(null); }}
                      style={{ cursor: "pointer", backgroundColor: isSelected ? "#f8fafc" : "transparent" }}
                    >
                      <td><code>#{ex.id}</code></td>
                      <td style={{ fontWeight: "600" }}>{ex.workflowName} (v{ex.version})</td>
                      <td>
                        <span className={`badge ${ex.status === "COMPLETED" ? "success" : ex.status === "RUNNING" ? "info" : ex.status === "CANCELLED" ? "secondary" : "danger"}`}>
                          {ex.status}
                        </span>
                      </td>
                      <td>{new Date(ex.createdAt).toLocaleTimeString()}</td>
                      <td>
                        <div style={{ display: "flex", gap: "8px" }}>
                          <button
                            className="btn secondary"
                            style={{ padding: "4px 8px", fontSize: "0.75rem" }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedEx(ex);
                              setAiDiagnosis(null);
                            }}
                          >
                            Chi tiết
                          </button>
                          {ex.status === "RUNNING" && can("executionCancel") && (
                            <button
                              className="btn danger"
                              style={{ padding: "4px 8px", fontSize: "0.75rem" }}
                              onClick={(e) => {
                                e.stopPropagation();
                                cancelExecution(ex.id);
                              }}
                            >
                              Hủy
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Selected Execution Task Trace */}
        {selectedEx && (
          <div className="card" style={{ padding: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e2e8f0", paddingBottom: "12px", marginBottom: "16px" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: "700" }}>
                  Execution #{selectedEx.id}: {selectedEx.workflowName}
                </h3>
                <span style={{ fontSize: "0.8rem", color: "#64748b" }}>Trạng thái: <strong>{selectedEx.status}</strong></span>
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                {selectedEx.status === "FAILED" && (
                  <button
                    className="btn secondary"
                    style={{ padding: "4px 8px", fontSize: "0.75rem", background: "#fef2f2", borderColor: "#fca5a5", color: "#dc2626" }}
                    onClick={() => handleAiDiagnose(selectedEx.id)}
                    disabled={diagnosing}
                  >
                    ✨ {diagnosing ? "Đang chẩn đoán..." : "AI Chẩn Đoán Lỗi"}
                  </button>
                )}
                <button className="icon-btn" onClick={() => setSelectedEx(null)}><I name="x" size={16} /></button>
              </div>
            </div>

            {/* AI Diagnosis Result Box */}
            {aiDiagnosis && (
              <div style={{ padding: "14px", backgroundColor: "#fff1f2", border: "1px solid #fecdd3", borderRadius: "8px", marginBottom: "16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <span style={{ fontWeight: "700", color: "#9f1239", fontSize: "0.9rem" }}>🤖 Phân Tích Lỗi Của AI:</span>
                  <span className={`badge ${aiDiagnosis.severity === "HIGH" ? "danger" : "warning"}`}>{aiDiagnosis.severity} SEVERITY</span>
                </div>
                <div style={{ fontSize: "0.85rem", color: "#881337", marginBottom: "8px" }}>
                  <strong>Nguyên nhân:</strong> {aiDiagnosis.rootCause}
                </div>
                <div style={{ fontSize: "0.85rem", color: "#0f766e", backgroundColor: "#f0fdfa", padding: "8px", borderRadius: "6px", border: "1px solid #ccfbf1" }}>
                  <strong>Khuyến nghị khắc phục:</strong>
                  <pre style={{ margin: "4px 0 0 0", fontFamily: "inherit", whiteSpace: "pre-wrap" }}>{aiDiagnosis.suggestedFix}</pre>
                </div>
              </div>
            )}

            <div style={{ marginBottom: "16px" }}>
              <span style={{ fontSize: "0.85rem", fontWeight: "600", color: "#475569" }}>Input Payload:</span>
              <pre style={{ backgroundColor: "#f8fafc", padding: "10px", borderRadius: "6px", fontSize: "0.8rem", overflowX: "auto", border: "1px solid #e2e8f0", marginTop: "4px" }}>
                {selectedEx.inputPayloadJson}
              </pre>
            </div>

            <h4 style={{ margin: "16px 0 10px 0", fontSize: "0.95rem", fontWeight: "600" }}>Chi tiết các Step trong Execution:</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {(selectedEx.tasks || []).map((t) => (
                <div
                  key={t.id || t.stepId}
                  style={{
                    padding: "10px 14px",
                    border: "1px solid #e2e8f0",
                    borderRadius: "6px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    backgroundColor: t.status === "COMPLETED" ? "#f0fdf4" : t.status === "RUNNING" ? "#eff6ff" : t.status === "FAILED" ? "#fef2f2" : "#fff",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: "600", fontSize: "0.88rem" }}>{t.stepName || t.stepId}</div>
                    <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "2px" }}>
                      Queue: <code>{t.queueName || "default"}</code>
                      {t.assignedWorkerId && <span> • Worker: <code>{t.assignedWorkerId}</code></span>}
                    </div>
                  </div>
                  <div>
                    <span className={`badge ${t.status === "COMPLETED" ? "success" : t.status === "RUNNING" ? "info" : t.status === "FAILED" ? "danger" : "secondary"}`}>
                      {t.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
