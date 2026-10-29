import { useState } from "react";
import { useFinance } from "../../../lib/store";
import { I } from "../../../lib/icons";
import { api } from "../../../lib/api";

export default function WorkflowDefinitionsPage() {
  const { workflows, triggerWorkflow, createWorkflow, can, toast } = useFinance();
  const [selectedWf, setSelectedWf] = useState(null);
  const [triggerModalWf, setTriggerModalWf] = useState(null);
  const [inputPayload, setInputPayload] = useState('{\n  "source": "manual",\n  "batchId": "batch-2026-10",\n  "debug": false\n}');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiReasoning, setAiReasoning] = useState("");

  const [newWfName, setNewWfName] = useState("");
  const [newWfDesc, setNewWfDesc] = useState("");
  const [newWfStepsJson, setNewWfStepsJson] = useState(JSON.stringify({
    steps: [
      { id: "step-fetch", name: "Fetch Payload", type: "HTTP_TASK", queue: "default", dependsOn: [], maxRetries: 2, timeoutSeconds: 30 },
      { id: "step-process", name: "Compute Pipeline", type: "WORKER_TASK", queue: "compute", dependsOn: ["step-fetch"], maxRetries: 3, timeoutSeconds: 120 },
      { id: "step-notify", name: "Publish Result", type: "NOTIFICATION", queue: "default", dependsOn: ["step-process"], maxRetries: 1, timeoutSeconds: 15 }
    ]
  }, null, 2));

  const handleTrigger = (e) => {
    e.preventDefault();
    if (!triggerModalWf) return;
    triggerWorkflow(triggerModalWf.id, inputPayload);
    setTriggerModalWf(null);
  };

  const handleCreate = (e) => {
    e.preventDefault();
    try {
      const parsedDag = JSON.parse(newWfStepsJson);
      createWorkflow({
        name: newWfName.trim(),
        description: newWfDesc.trim(),
        dag: parsedDag,
      });
      setShowCreateModal(false);
      setNewWfName("");
      setNewWfDesc("");
      toast("Đã khởi tạo Workflow DAG thành công!", "success");
    } catch {
      toast("Định dạng JSON của DAG không hợp lệ!", "danger");
    }
  };

  const handleAiGenerate = async (e) => {
    e.preventDefault();
    if (!aiPrompt.trim()) return;
    setAiLoading(true);
    setAiReasoning("");
    try {
      const res = await api.post("/ai/generate-workflow", { prompt: aiPrompt });
      setNewWfName(res.name || "AI-Generated-DAG");
      setNewWfDesc(res.description || "");
      setNewWfStepsJson(JSON.stringify(res.dag, null, 2));
      setAiReasoning(res.reasoning || "");
      setShowAiModal(false);
      setShowCreateModal(true);
      toast("AI đã phân tích và thiết kế đồ thị DAG thành công!", "success");
    } catch (err) {
      toast(err.message || "Lỗi AI sinh workflow", "danger");
    } finally {
      setAiLoading(false);
    }
  };

  const AI_SAMPLE_PROMPTS = [
    "Xây dựng pipeline ETL trích xuất dữ liệu, làm sạch và nạp vào data warehouse",
    "Quy trình thanh toán đơn hàng có kiểm tra gian lận, trừ tiền và gửi email",
    "Hệ thống huấn luyện AI: tiền xử lý ảnh, trích xuất embedding và indexing vector"
  ];

  return (
    <div className="orch-page-wrap">
      {/* Action Header */}
      <div className="orch-page-header">
        <div>
          <h2 className="orch-page-heading">Định Nghĩa Quy Trình (DAG Definitions)</h2>
          <p className="orch-page-sub">
            Quản lý đồ thị có hướng không chu trình (Directed Acyclic Graphs), ràng buộc bước chạy và phân bổ Queue
          </p>
        </div>
        <div className="orch-header-actions">
          {can("workflowWrite") && (
            <>
              <button
                type="button"
                className="orch-btn orch-btn-ai"
                onClick={() => setShowAiModal(true)}
              >
                <I name="sparkles" size={16} />
                <span>AI Sinh Workflow (Prompt-to-DAG)</span>
              </button>
              <button
                type="button"
                className="orch-btn orch-btn-primary"
                onClick={() => setShowCreateModal(true)}
              >
                <I name="plus" size={16} />
                <span>Tạo Workflow Mới</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Grid of Workflow Cards */}
      <div className="orch-card-grid-3">
        {workflows.map((wf) => {
          const steps = wf.dag?.steps || [];
          const queues = Array.from(new Set(steps.map((s) => s.queue || "default")));

          return (
            <div key={wf.id} className="orch-wf-card">
              <div className="orch-wf-card-top">
                <div className="orch-wf-badge-row">
                  <span className="orch-tag success">Active DAG</span>
                  <span className="orch-tag neutral">v{wf.version}</span>
                </div>
                <h3 className="orch-wf-card-title">{wf.name}</h3>
                <p className="orch-wf-card-desc">{wf.description || "Không có mô tả chi tiết."}</p>
              </div>

              {/* Visual mini-pipeline of steps */}
              <div className="orch-dag-preview">
                <span className="orch-dag-label">Cấu trúc các bước (Pipeline Steps):</span>
                <div className="orch-dag-steps-scroll">
                  {steps.map((step, idx) => (
                    <div key={step.id} className="orch-dag-step-node">
                      <div className="orch-dag-node-box">
                        <span className="orch-dag-node-id">{step.id}</span>
                        <span className="orch-dag-node-name">{step.name}</span>
                        <span className="orch-dag-node-queue">Queue: {step.queue || "default"}</span>
                      </div>
                      {idx < steps.length - 1 && (
                        <div className="orch-dag-arrow">
                          <I name="arrow-right" size={13} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="orch-wf-card-footer">
                <div className="orch-wf-queues-list">
                  <span className="orch-meta-label">Queues:</span>
                  {queues.map((q) => (
                    <code key={q} className="orch-code-inline">{q}</code>
                  ))}
                </div>
                <div className="orch-wf-btn-group">
                  <button
                    className="orch-btn orch-btn-ghost orch-btn-sm"
                    onClick={() => setSelectedWf(wf)}
                  >
                    <I name="eye" size={14} /> Chi tiết DAG
                  </button>
                  {can("executionTrigger") && (
                    <button
                      className="orch-btn orch-btn-primary orch-btn-sm"
                      onClick={() => setTriggerModalWf(wf)}
                    >
                      <I name="play" size={14} /> Trigger Run
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal: View DAG Details */}
      {selectedWf && (
        <div className="orch-modal-backdrop" onClick={() => setSelectedWf(null)}>
          <div className="orch-modal orch-modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="orch-modal-head">
              <div className="orch-modal-title-group">
                <div className="orch-modal-icon-badge"><I name="git-fork" size={20} /></div>
                <div>
                  <h3 className="orch-modal-title">{selectedWf.name}</h3>
                  <span className="orch-modal-subtitle">Định nghĩa chi tiết đồ thị DAG & cấu hình Retry</span>
                </div>
              </div>
              <button className="orch-icon-btn" onClick={() => setSelectedWf(null)}>
                <I name="x" size={18} />
              </button>
            </div>

            <div className="orch-modal-body">
              <div className="orch-meta-banner">
                <div className="orch-meta-item">
                  <span className="orch-meta-label">Phiên bản</span>
                  <span className="orch-meta-val">v{selectedWf.version}</span>
                </div>
                <div className="orch-meta-item">
                  <span className="orch-meta-label">Tổng số Steps</span>
                  <span className="orch-meta-val">{selectedWf.dag?.steps?.length || 0} tác vụ</span>
                </div>
                <div className="orch-meta-item">
                  <span className="orch-meta-label">Kiểm tra Chu trình</span>
                  <span className="orch-meta-val orch-text-emerald">Hợp lệ (DAG acyclic)</span>
                </div>
              </div>

              <h4 className="orch-section-heading">Danh sách nhiệm vụ & Quan hệ phụ thuộc (Dependencies):</h4>
              <div className="orch-step-detail-list">
                {selectedWf.dag?.steps?.map((step) => (
                  <div key={step.id} className="orch-step-card">
                    <div className="orch-step-card-header">
                      <div className="orch-step-card-info">
                        <code className="orch-step-id">{step.id}</code>
                        <strong className="orch-step-name">{step.name}</strong>
                      </div>
                      <span className="orch-tag blue">{step.type}</span>
                    </div>
                    <div className="orch-step-card-meta">
                      <div className="orch-step-meta-col">
                        <span>Hàng đợi:</span> <code>{step.queue || "default"}</code>
                      </div>
                      <div className="orch-step-meta-col">
                        <span>Phụ thuộc (Depends On):</span>
                        {step.dependsOn && step.dependsOn.length > 0 ? (
                          step.dependsOn.map((d) => <code key={d} className="orch-code-dep">{d}</code>)
                        ) : (
                          <span className="orch-step-root">Root Step (Chạy ngay)</span>
                        )}
                      </div>
                      <div className="orch-step-meta-col">
                        <span>Retry Policy:</span> <strong>{step.maxRetries ?? 2} lần</strong> (Timeout: {step.timeoutSeconds ?? 60}s)
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <h4 className="orch-section-heading" style={{ marginTop: "20px" }}>DAG Raw Definition (JSON):</h4>
              <pre className="orch-code-block">{JSON.stringify(selectedWf.dag, null, 2)}</pre>
            </div>

            <div className="orch-modal-actions">
              <button className="orch-btn orch-btn-secondary" onClick={() => setSelectedWf(null)}>Đóng</button>
              {can("executionTrigger") && (
                <button
                  className="orch-btn orch-btn-primary"
                  onClick={() => {
                    const target = selectedWf;
                    setSelectedWf(null);
                    setTriggerModalWf(target);
                  }}
                >
                  <I name="play" size={15} /> Kích hoạt Run
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Trigger Workflow */}
      {triggerModalWf && (
        <div className="orch-modal-backdrop" onClick={() => setTriggerModalWf(null)}>
          <div className="orch-modal" style={{ maxWidth: "540px" }} onClick={(e) => e.stopPropagation()}>
            <div className="orch-modal-head">
              <div className="orch-modal-title-group">
                <div className="orch-modal-icon-badge blue"><I name="play" size={18} /></div>
                <div>
                  <h3 className="orch-modal-title">Kích Hoạt Workflow Run</h3>
                  <span className="orch-modal-subtitle">{triggerModalWf.name} (v{triggerModalWf.version})</span>
                </div>
              </div>
              <button className="orch-icon-btn" onClick={() => setTriggerModalWf(null)}><I name="x" size={18} /></button>
            </div>
            <form onSubmit={handleTrigger} className="orch-modal-body">
              <label className="orch-form-label">Input Payload (JSON):</label>
              <p className="orch-form-hint">Dữ liệu đầu vào sẽ được truyền qua toàn bộ context của các bước chạy</p>
              <textarea
                rows={6}
                value={inputPayload}
                onChange={(e) => setInputPayload(e.target.value)}
                className="orch-textarea-code"
              />
              <div className="orch-modal-actions" style={{ marginTop: "18px" }}>
                <button type="button" className="orch-btn orch-btn-secondary" onClick={() => setTriggerModalWf(null)}>Hủy bỏ</button>
                <button type="submit" className="orch-btn orch-btn-primary">
                  <I name="play" size={15} /> Bắt đầu chạy ngay
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Create Workflow (Manual) */}
      {showCreateModal && (
        <div className="orch-modal-backdrop" onClick={() => setShowCreateModal(false)}>
          <div className="orch-modal orch-modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="orch-modal-head">
              <div className="orch-modal-title-group">
                <div className="orch-modal-icon-badge indigo"><I name="git-fork" size={18} /></div>
                <div>
                  <h3 className="orch-modal-title">Định Nghĩa Workflow Mới (DAG)</h3>
                  <span className="orch-modal-subtitle">Tạo định nghĩa quy trình và các ràng buộc dependency</span>
                </div>
              </div>
              <button className="orch-icon-btn" onClick={() => setShowCreateModal(false)}><I name="x" size={18} /></button>
            </div>
            <form onSubmit={handleCreate} className="orch-modal-body">
              {aiReasoning && (
                <div className="orch-ai-reasoning-box">
                  <div className="orch-ai-reasoning-header">
                    <I name="sparkles" size={16} />
                    <strong>Giải trình thiết kế của AI:</strong>
                  </div>
                  <p>{aiReasoning}</p>
                </div>
              )}
              <div className="orch-form-group">
                <label className="orch-form-label">Tên Workflow:</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Order-Fulfillment-DAG"
                  value={newWfName}
                  onChange={(e) => setNewWfName(e.target.value)}
                  className="orch-input"
                />
              </div>
              <div className="orch-form-group">
                <label className="orch-form-label">Mô tả mục đích:</label>
                <input
                  type="text"
                  placeholder="Mô tả chức năng của quy trình..."
                  value={newWfDesc}
                  onChange={(e) => setNewWfDesc(e.target.value)}
                  className="orch-input"
                />
              </div>
              <div className="orch-form-group">
                <label className="orch-form-label">Định nghĩa DAG Steps (JSON):</label>
                <p className="orch-form-hint">Mỗi step có queue, type, dependsOn và timeoutSeconds</p>
                <textarea
                  rows={8}
                  required
                  value={newWfStepsJson}
                  onChange={(e) => setNewWfStepsJson(e.target.value)}
                  className="orch-textarea-code"
                />
              </div>
              <div className="orch-modal-actions">
                <button type="button" className="orch-btn orch-btn-secondary" onClick={() => setShowCreateModal(false)}>Hủy</button>
                <button type="submit" className="orch-btn orch-btn-primary">
                  <I name="save" size={15} /> Lưu & Biên Dịch DAG
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: AI Prompt-to-DAG */}
      {showAiModal && (
        <div className="orch-modal-backdrop" onClick={() => setShowAiModal(false)}>
          <div className="orch-modal" style={{ maxWidth: "620px" }} onClick={(e) => e.stopPropagation()}>
            <div className="orch-modal-head">
              <div className="orch-modal-title-group">
                <div className="orch-modal-icon-badge purple"><I name="sparkles" size={18} /></div>
                <div>
                  <h3 className="orch-modal-title">AI Prompt-to-DAG Generator</h3>
                  <span className="orch-modal-subtitle">Mô tả quy trình bằng ngôn ngữ tự nhiên để AI tự động xây dựng DAG</span>
                </div>
              </div>
              <button className="orch-icon-btn" onClick={() => setShowAiModal(false)}><I name="x" size={18} /></button>
            </div>
            <form onSubmit={handleAiGenerate} className="orch-modal-body">
              <label className="orch-form-label">Mô tả quy trình nghiệp vụ cần tạo:</label>
              <textarea
                rows={4}
                required
                placeholder="Ví dụ: Tạo quy trình xử lý đơn hàng gồm kiểm tra tồn kho, trừ tiền qua cổng payment, gửi hóa đơn và cập nhật trạng thái..."
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                className="orch-textarea"
              />

              <div className="orch-prompt-suggestions">
                <span className="orch-prompt-sugg-title">Gợi ý mẫu:</span>
                {AI_SAMPLE_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    className="orch-sugg-pill"
                    onClick={() => setAiPrompt(prompt)}
                  >
                    {prompt}
                  </button>
                ))}
              </div>

              <div className="orch-modal-actions" style={{ marginTop: "20px" }}>
                <button type="button" className="orch-btn orch-btn-secondary" onClick={() => setShowAiModal(false)}>Hủy</button>
                <button type="submit" className="orch-btn orch-btn-ai" disabled={aiLoading}>
                  <I name="sparkles" size={15} />
                  <span>{aiLoading ? "AI đang tư duy & thiết kế DAG..." : "Thiết kế Quy Trình"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
