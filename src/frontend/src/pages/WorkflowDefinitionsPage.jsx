import { useState } from "react";
import { useOrchestrator } from "../lib/store";
import { I } from "../lib/icons";
import { api } from "../lib/api";

export default function WorkflowDefinitionsPage() {
  const { workflows, triggerWorkflow, createWorkflow, can, toast } = useOrchestrator();
  const [selectedWf, setSelectedWf] = useState(null);
  const [triggerModalWf, setTriggerModalWf] = useState(null);
  const [inputPayload, setInputPayload] = useState('{\n  "source": "manual",\n  "debug": false\n}');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiReasoning, setAiReasoning] = useState("");

  const [newWfName, setNewWfName] = useState("");
  const [newWfDesc, setNewWfDesc] = useState("");
  const [newWfStepsJson, setNewWfStepsJson] = useState(JSON.stringify({
    steps: [
      { id: "step-1", name: "Fetch Payload", type: "HTTP_TASK", queue: "default", dependsOn: [], maxRetries: 2, timeoutSeconds: 30 },
      { id: "step-2", name: "Process Job", type: "WORKER_TASK", queue: "compute", dependsOn: ["step-1"], maxRetries: 3, timeoutSeconds: 120 }
    ]
  }, null, 2));

  const handleTrigger = (e) => {
    e.preventDefault();
    if (!triggerModalWf) return;
    triggerWorkflow(triggerModalWf.id, inputPayload);
    setTriggerModalWf(null);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      let raw = (newWfStepsJson || "").trim();
      if (!raw) {
        toast("Vui lòng nhập định nghĩa DAG (JSON)!", "warning");
        return;
      }
      if (raw.includes("```")) {
        const match = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
        if (match) raw = match[1].trim();
      }
      const firstBrace = raw.indexOf("{");
      const firstBracket = raw.indexOf("[");
      let startIdx = -1;
      if (firstBrace !== -1 && firstBracket !== -1) {
        startIdx = Math.min(firstBrace, firstBracket);
      } else {
        startIdx = Math.max(firstBrace, firstBracket);
      }
      if (startIdx > 0) raw = raw.slice(startIdx);
      const lastBrace = raw.lastIndexOf("}");
      const lastBracket = raw.lastIndexOf("]");
      const endIdx = Math.max(lastBrace, lastBracket);
      if (endIdx !== -1 && endIdx < raw.length - 1) raw = raw.slice(0, endIdx + 1);

      raw = raw.replace(/\\+(\r?\n|$)/g, "\n");
      raw = raw.replace(/,(\s*[}\]])/g, "$1");

      const parsed = JSON.parse(raw);
      let wfName = newWfName.trim();
      let wfDesc = newWfDesc.trim();
      let dagObj = parsed;

      if (!Array.isArray(parsed) && typeof parsed === "object") {
        if (!wfName && (parsed.name || parsed.workflowName || parsed.title)) {
          wfName = (parsed.name || parsed.workflowName || parsed.title).trim();
        }
        if (!wfDesc && (parsed.description || parsed.desc || parsed.summary)) {
          wfDesc = (parsed.description || parsed.desc || parsed.summary).trim();
        }
      }

      if (Array.isArray(parsed)) {
        dagObj = { steps: parsed };
      } else if (parsed.dag && Array.isArray(parsed.dag.steps)) {
        dagObj = parsed.dag;
      } else if (Array.isArray(parsed.steps)) {
        dagObj = { steps: parsed.steps };
      }

      if (!wfName) wfName = "Custom-DAG-Workflow";

      const res = await createWorkflow({
        name: wfName,
        description: wfDesc,
        dag: dagObj,
      });

      if (res && res.id) {
        setShowCreateModal(false);
        setNewWfName("");
        setNewWfDesc("");
      }
    } catch (err) {
      toast("Lỗi JSON DAG: " + (err.message || ""), "danger");
    }
  };

  const handleAiGenerate = async (e) => {
    e.preventDefault();
    if (!aiPrompt.trim()) return;
    setAiLoading(true);
    setAiReasoning("");
    try {
      const res = await api.post("/ai/generate-workflow", { prompt: aiPrompt.trim() });
      setNewWfName(res.name);
      setNewWfDesc(res.description);
      setNewWfStepsJson(JSON.stringify(res.dag, null, 2));
      setAiReasoning(res.reasoning);
      setShowAiModal(false);
      setShowCreateModal(true);
      toast("AI đã thiết kế xong DAG quy trình tối ưu!", "success");
    } catch (err) {
      toast(err.message || "Lỗi tạo quy trình với AI", "danger");
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="workflows-page">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: "700" }}>Workflow Definitions (DAG)</h2>
          <p style={{ margin: "4px 0 0 0", color: "#64748b", fontSize: "0.875rem" }}>
            Các bản thiết kế quy trình phân tán, định nghĩa phụ thuộc các task và retry policy
          </p>
        </div>
        {can("workflowWrite") && (
          <div style={{ display: "flex", gap: "10px" }}>
            <button
              className="btn secondary"
              style={{ background: "linear-gradient(135deg, #eff6ff 0%, #e0e7ff 100%)", borderColor: "#6366f1", color: "#4f46e5", fontWeight: "600" }}
              onClick={() => setShowAiModal(true)}
            >
              ✨ Tạo DAG bằng AI
            </button>
            <button className="btn primary" onClick={() => setShowCreateModal(true)}>
              <I name="plus" size={16} /> Tạo Thủ Công
            </button>
          </div>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.3fr", gap: "24px" }}>
        {/* List of Workflows */}
        <div className="card" style={{ padding: "16px" }}>
          <h3 style={{ margin: "0 0 16px 0", fontSize: "1rem", fontWeight: "600" }}>Danh Sách Workflow</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {workflows.map((wf) => {
              const isSelected = selectedWf?.id === wf.id;
              return (
                <div
                  key={wf.id}
                  onClick={() => setSelectedWf(wf)}
                  style={{
                    padding: "14px",
                    borderRadius: "8px",
                    border: `1.5px solid ${isSelected ? "#3b82f6" : "#e2e8f0"}`,
                    backgroundColor: isSelected ? "#eff6ff" : "var(--bg-card, #fff)",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontWeight: "700", color: "#1e293b", fontSize: "0.95rem" }}>{wf.name}</span>
                    <span className="badge success">v{wf.version}</span>
                  </div>
                  <p style={{ margin: "6px 0 10px 0", fontSize: "0.85rem", color: "#64748b" }}>{wf.description}</p>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>{wf.dag?.steps?.length || 0} Steps</span>
                    <button
                      className="btn primary"
                      style={{ padding: "4px 10px", fontSize: "0.8rem" }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setTriggerModalWf(wf);
                      }}
                    >
                      <I name="play" size={13} /> Kích hoạt
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Workflow Detail & Visual DAG Steps */}
        <div className="card" style={{ padding: "20px" }}>
          {selectedWf ? (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e2e8f0", paddingBottom: "12px", marginBottom: "16px" }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: "700" }}>{selectedWf.name}</h3>
                  <span style={{ fontSize: "0.8rem", color: "#64748b" }}>Phiên bản: v{selectedWf.version} • Tạo ngày: {new Date(selectedWf.createdAt).toLocaleDateString()}</span>
                </div>
                <button className="btn primary" onClick={() => setTriggerModalWf(selectedWf)}>
                  <I name="play" size={15} /> Kích hoạt Run
                </button>
              </div>

              <h4 style={{ margin: "16px 0 12px 0", fontSize: "0.95rem", fontWeight: "600" }}>Các bước thực thi (DAG Steps Sequence):</h4>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {selectedWf.dag?.steps?.map((step, idx) => (
                  <div key={step.id} style={{ display: "flex", alignItems: "flex-start", gap: "12px", padding: "12px", border: "1px solid #e2e8f0", borderRadius: "8px" }}>
                    <div style={{ width: "28px", height: "28px", borderRadius: "50%", backgroundColor: step.type === "AI_AGENT_TASK" ? "#8b5cf6" : "#3b82f6", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "700", fontSize: "0.85rem" }}>
                      {step.type === "AI_AGENT_TASK" ? "🤖" : idx + 1}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontWeight: "600", fontSize: "0.9rem" }}>{step.name}</span>
                        <span className={`badge ${step.type === "AI_AGENT_TASK" ? "warning" : "info"}`}>{step.type}</span>
                      </div>
                      <div style={{ fontSize: "0.8rem", color: "#64748b", marginTop: "4px" }}>
                        <span>Queue: <code>{step.queue || "default"}</code></span> • 
                        <span> Max Retries: <code>{step.maxRetries}</code></span> • 
                        <span> Timeout: <code>{step.timeoutSeconds}s</code></span>
                      </div>
                      {step.dependsOn?.length > 0 && (
                        <div style={{ marginTop: "6px", fontSize: "0.75rem", color: "#d97706" }}>
                          Depends on: {step.dependsOn.map((d) => <code key={d} style={{ marginRight: "4px" }}>{d}</code>)}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "60px 20px", color: "#94a3b8" }}>
              <I name="git-fork" size={48} />
              <p style={{ marginTop: "12px" }}>Chọn một workflow ở danh sách bên trái để xem chi tiết DAG Steps</p>
            </div>
          )}
        </div>
      </div>

      {/* AI Generator Modal */}
      {showAiModal && (
        <div className="modal-back open" onClick={() => setShowAiModal(false)}>
          <div className="modal" style={{ maxWidth: "560px" }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3>✨ AI Workflow Generator</h3>
              <button className="icon-btn" onClick={() => setShowAiModal(false)}><I name="x" size={18} /></button>
            </div>
            <form onSubmit={handleAiGenerate} style={{ padding: "20px" }}>
              <p style={{ color: "#64748b", fontSize: "0.85rem", marginTop: 0 }}>
                Nhập ý tưởng quy trình của bạn bằng ngôn ngữ tự nhiên. AI sẽ phân tích, chia nhỏ các bước, gán task types (Worker, HTTP, AI Agent) và thiết lập dependency graph tự động:
              </p>
              <textarea
                rows={4}
                required
                placeholder="Ví dụ: Quy trình tự động phân tích đánh giá của khách hàng, trích xuất cảm xúc bằng AI, phân loại khẩn cấp để gửi alert tới Slack và lưu dữ liệu vào kho."
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                style={{ width: "100%", fontSize: "0.9rem", padding: "10px", borderRadius: "6px", border: "1px solid #cbd5e1" }}
              />
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "16px" }}>
                <button type="button" className="btn secondary" onClick={() => setShowAiModal(false)}>Hủy</button>
                <button type="submit" className="btn primary" disabled={aiLoading}>
                  {aiLoading ? "Đang thiết kế DAG..." : "✨ Tạo Quy Trình Bằng AI"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Trigger Modal */}
      {triggerModalWf && (
        <div className="modal-back open" onClick={() => setTriggerModalWf(null)}>
          <div className="modal" style={{ maxWidth: "520px" }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3>Kích Hoạt Workflow: {triggerModalWf.name}</h3>
              <button className="icon-btn" onClick={() => setTriggerModalWf(null)}><I name="x" size={18} /></button>
            </div>
            <form onSubmit={handleTrigger} style={{ padding: "20px" }}>
              <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", fontSize: "0.85rem" }}>
                Input Payload (JSON):
              </label>
              <textarea
                rows={6}
                value={inputPayload}
                onChange={(e) => setInputPayload(e.target.value)}
                style={{ width: "100%", fontFamily: "monospace", fontSize: "0.85rem", padding: "10px", borderRadius: "6px", border: "1px solid #cbd5e1" }}
              />
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "16px" }}>
                <button type="button" className="btn secondary" onClick={() => setTriggerModalWf(null)}>Hủy</button>
                <button type="submit" className="btn primary"><I name="play" size={15} /> Bắt đầu chạy</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="modal-back open" onClick={() => setShowCreateModal(false)}>
          <div className="modal" style={{ maxWidth: "600px" }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3>Định Nghĩa Workflow Mới (DAG)</h3>
              <button className="icon-btn" onClick={() => setShowCreateModal(false)}><I name="x" size={18} /></button>
            </div>
            <form onSubmit={handleCreate} style={{ padding: "20px" }}>
              {aiReasoning && (
                <div style={{ marginBottom: "16px", padding: "12px", backgroundColor: "#f5f3ff", border: "1px solid #ddd6fe", borderRadius: "6px", fontSize: "0.85rem", color: "#6b21a8" }}>
                  <strong>🤖 AI Reasoning:</strong> {aiReasoning}
                </div>
              )}
              <div style={{ marginBottom: "14px" }}>
                <label style={{ display: "block", marginBottom: "4px", fontWeight: "600", fontSize: "0.85rem" }}>Tên Workflow:</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Batch-Processing-Saga"
                  value={newWfName}
                  onChange={(e) => setNewWfName(e.target.value)}
                  style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1" }}
                />
              </div>
              <div style={{ marginBottom: "14px" }}>
                <label style={{ display: "block", marginBottom: "4px", fontWeight: "600", fontSize: "0.85rem" }}>Mô tả:</label>
                <input
                  type="text"
                  placeholder="Mô tả mục đích của workflow..."
                  value={newWfDesc}
                  onChange={(e) => setNewWfDesc(e.target.value)}
                  style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1" }}
                />
              </div>
              <div style={{ marginBottom: "14px" }}>
                <label style={{ display: "block", marginBottom: "4px", fontWeight: "600", fontSize: "0.85rem" }}>Định nghĩa DAG Steps (JSON):</label>
                <textarea
                  rows={8}
                  required
                  value={newWfStepsJson}
                  onChange={(e) => setNewWfStepsJson(e.target.value)}
                  style={{ width: "100%", fontFamily: "monospace", fontSize: "0.85rem", padding: "10px", borderRadius: "6px", border: "1px solid #cbd5e1" }}
                />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "16px" }}>
                <button type="button" className="btn secondary" onClick={() => setShowCreateModal(false)}>Hủy</button>
                <button type="submit" className="btn primary">Lưu Workflow</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
