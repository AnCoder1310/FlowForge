import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useOrchestrator } from "../../../lib/store";
import { I } from "../../../lib/icons";
import { api } from "../../../lib/api";

/**
 * Computes execution stages using Kahn's topological sort level assignment.
 * Nodes at the same level can be executed concurrently in parallel worker queues.
 */
function computeDagStages(steps = []) {
  if (!steps || steps.length === 0) return [];
  const levels = {};
  steps.forEach((s) => {
    if (!s.dependsOn || s.dependsOn.length === 0) {
      levels[s.id] = 0;
    }
  });

  let changed = true;
  let iterations = 0;
  while (changed && iterations < steps.length) {
    changed = false;
    iterations++;
    steps.forEach((s) => {
      const deps = s.dependsOn || [];
      if (deps.length > 0) {
        const depLevels = deps.map((d) => levels[d]);
        if (depLevels.every((lvl) => lvl !== undefined)) {
          const maxDepLevel = Math.max(...depLevels);
          if (levels[s.id] !== maxDepLevel + 1) {
            levels[s.id] = maxDepLevel + 1;
            changed = true;
          }
        }
      }
    });
  }

  steps.forEach((s, idx) => {
    if (levels[s.id] === undefined) levels[s.id] = idx;
  });

  const maxLevel = Math.max(...Object.values(levels), 0);
  const stages = [];
  for (let l = 0; l <= maxLevel; l++) {
    const stageSteps = steps.filter((s) => levels[s.id] === l);
    if (stageSteps.length > 0) {
      stages.push({
        level: l + 1,
        isParallel: stageSteps.length > 1,
        steps: stageSteps,
      });
    }
  }
  return stages;
}

export default function WorkflowDefinitionsPage() {
  const nav = useNavigate();
  const { workflows, triggerWorkflow, createWorkflow, deleteWorkflow, loadWorkflows, can, toast } = useOrchestrator();

  useEffect(() => {
    if (loadWorkflows) loadWorkflows();
  }, [loadWorkflows]);

  // Filtering & View State
  const [quickFilter, setQuickFilter] = useState("all"); // "all" | "ai" | "parallel" | "active"
  const [searchQuery, setSearchQuery] = useState("");
  const [queueFilter, setQueueFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState("newest"); // "newest" | "name" | "steps_desc" | "steps_asc"
  const [viewMode, setViewMode] = useState("grid"); // "grid" | "table"

  // Modal states
  const [selectedWf, setSelectedWf] = useState(null);
  const [detailsTab, setDetailsTab] = useState("stages"); // "stages" | "steps" | "json"
  const [triggerModalWf, setTriggerModalWf] = useState(null);
  const [inputPayload, setInputPayload] = useState('{\n  "source": "manual-dispatch",\n  "batchId": "batch-2026-10",\n  "debug": false\n}');
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiReasoning, setAiReasoning] = useState("");

  const [newWfName, setNewWfName] = useState("");
  const [newWfDesc, setNewWfDesc] = useState("");
  const [newWfStepsJson, setNewWfStepsJson] = useState(
    JSON.stringify(
      {
        steps: [
          { id: "step-fetch", name: "Fetch Payload", type: "HTTP_TASK", queue: "default", dependsOn: [], maxRetries: 2, timeoutSeconds: 30 },
          { id: "step-process", name: "Compute Pipeline", type: "WORKER_TASK", queue: "compute", dependsOn: ["step-fetch"], maxRetries: 3, timeoutSeconds: 120 },
          { id: "step-notify", name: "Publish Result", type: "NOTIFICATION", queue: "notification", dependsOn: ["step-process"], maxRetries: 1, timeoutSeconds: 30 },
        ],
      },
      null,
      2
    )
  );

  const handleDeleteWorkflow = (wfId, wfName) => {
    if (window.confirm(`Bạn có chắc muốn xóa quy trình "${wfName}" (ID: #${wfId}) không?`)) {
      deleteWorkflow(wfId);
    }
  };

  const handleTrigger = async (e) => {
    e.preventDefault();
    if (!triggerModalWf) return;
    const targetWf = triggerModalWf;
    setTriggerModalWf(null);
    const res = await triggerWorkflow(targetWf.id, inputPayload);
    if (res?.id) {
      nav("/executions", { state: { highlightId: res.id } });
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      let raw = (newWfStepsJson || "").trim();
      if (!raw) {
        toast("Vui lòng nhập định nghĩa DAG (JSON)!", "warning");
        return;
      }

      // 1. Strip markdown fences if user copied from markdown (```json ... ```)
      if (raw.includes("```")) {
        const match = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
        if (match) raw = match[1].trim();
      }

      // 2. Extract JSON substring if surrounded by explanation text
      const firstBrace = raw.indexOf("{");
      const firstBracket = raw.indexOf("[");
      let startIdx = -1;
      if (firstBrace !== -1 && firstBracket !== -1) {
        startIdx = Math.min(firstBrace, firstBracket);
      } else {
        startIdx = Math.max(firstBrace, firstBracket);
      }
      if (startIdx > 0) {
        raw = raw.slice(startIdx);
      }
      const lastBrace = raw.lastIndexOf("}");
      const lastBracket = raw.lastIndexOf("]");
      const endIdx = Math.max(lastBrace, lastBracket);
      if (endIdx !== -1 && endIdx < raw.length - 1) {
        raw = raw.slice(0, endIdx + 1);
      }

      // 3. Remove trailing line-continuation backslashes commonly copied from prompt / shell
      raw = raw.replace(/\\+(\r?\n|$)/g, "\n");
      // 4. Remove trailing commas before } or ]
      raw = raw.replace(/,(\s*[}\]])/g, "$1");

      const parsed = JSON.parse(raw);

      let wfName = newWfName.trim();
      let wfDesc = newWfDesc.trim();
      let dagObj = parsed;

      // Extract name/description from root JSON if not entered in form inputs
      if (!Array.isArray(parsed) && typeof parsed === "object") {
        if (!wfName && (parsed.name || parsed.workflowName || parsed.title)) {
          wfName = (parsed.name || parsed.workflowName || parsed.title).trim();
        }
        if (!wfDesc && (parsed.description || parsed.desc || parsed.summary)) {
          wfDesc = (parsed.description || parsed.desc || parsed.summary).trim();
        }
      }

      // Normalize DAG structure
      if (Array.isArray(parsed)) {
        dagObj = { steps: parsed };
      } else if (parsed.dag && Array.isArray(parsed.dag.steps)) {
        dagObj = parsed.dag;
      } else if (Array.isArray(parsed.steps)) {
        dagObj = { steps: parsed.steps };
      }

      if (!wfName) {
        wfName = "Custom-DAG-Workflow";
      }

      const res = await createWorkflow({
        name: wfName,
        description: wfDesc,
        dag: dagObj,
      });

      if (res && res.id) {
        setShowCreateModal(false);
        setNewWfName("");
        setNewWfDesc("");
        setSelectedWf(res);
      }
    } catch (err) {
      toast("Lỗi định dạng hoặc biên dịch JSON DAG: " + (err.message || ""), "danger");
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

  const handleCopyJson = (data) => {
    try {
      navigator.clipboard.writeText(JSON.stringify(data, null, 2));
      toast("Đã sao chép cấu trúc JSON vào Clipboard!", "success");
    } catch {
      toast("Không thể sao chép JSON", "warning");
    }
  };

  // KPI calculations
  const totalWorkflows = workflows.length;
  const activeWorkflows = workflows.filter((w) => w.isActive).length;
  
  const allQueues = useMemo(() => {
    const qSet = new Set();
    workflows.forEach((w) => {
      (w.dag?.steps || []).forEach((s) => {
        if (s.queue) qSet.add(s.queue);
      });
    });
    return Array.from(qSet).sort();
  }, [workflows]);

  const aiWorkflowsCount = useMemo(() => {
    return workflows.filter((w) => (w.dag?.steps || []).some((s) => s.type === "AI_AGENT_TASK")).length;
  }, [workflows]);

  const parallelWorkflowsCount = useMemo(() => {
    return workflows.filter((w) => {
      const stages = computeDagStages(w.dag?.steps || []);
      return stages.some((st) => st.isParallel);
    }).length;
  }, [workflows]);

  // Filtered & Sorted workflows
  const filteredWorkflows = useMemo(() => {
    let result = workflows.filter((wf) => {
      const steps = wf.dag?.steps || [];
      const stages = computeDagStages(steps);
      const hasAi = steps.some((s) => s.type === "AI_AGENT_TASK");
      const hasParallel = stages.some((st) => st.isParallel);

      // 1. Quick filter tabs
      if (quickFilter === "ai" && !hasAi) return false;
      if (quickFilter === "parallel" && !hasParallel) return false;
      if (quickFilter === "active" && !wf.isActive) return false;

      // 2. Queue filter
      if (queueFilter !== "ALL" && !steps.some((s) => s.queue === queueFilter)) {
        return false;
      }

      // 3. Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchName = wf.name?.toLowerCase().includes(query);
        const matchDesc = wf.description?.toLowerCase().includes(query);
        if (!matchName && !matchDesc) return false;
      }

      return true;
    });

    // Sorting
    result.sort((a, b) => {
      if (sortBy === "name") {
        return a.name.localeCompare(b.name);
      }
      if (sortBy === "steps_desc") {
        return (b.dag?.steps?.length || 0) - (a.dag?.steps?.length || 0);
      }
      if (sortBy === "steps_asc") {
        return (a.dag?.steps?.length || 0) - (b.dag?.steps?.length || 0);
      }
      // default: newest by id descending
      return (b.id || 0) - (a.id || 0);
    });

    return result;
  }, [workflows, quickFilter, queueFilter, searchQuery, sortBy]);

  const AI_SAMPLE_PROMPTS = [
    "Quy trình xử lý đơn hàng gồm kiểm tra tồn kho và thanh toán song song, sau đó đóng gói và giao hàng",
    "Pipeline ETL nạp dữ liệu Parquet phân tán, AI phát hiện dị thường dữ liệu và nạp Data Warehouse",
    "Quy trình AI tự động thu thập đánh giá, phân loại cảm xúc khách hàng và gửi cảnh báo Slack",
  ];

  return (
    <div className="orch-page-wrap">
      {/* 1. Header Section */}
      <div className="orch-wf-page-header">
        <div className="orch-wf-page-title-box">
          <div className="orch-wf-title-badge">
            <I name="workflow" size={22} />
          </div>
          <div>
            <div className="orch-wf-title-row">
              <h2 className="orch-wf-title">Định Nghĩa Quy Trình (DAG Definitions)</h2>
              <span className="orch-badge-counter">{totalWorkflows} Blueprints</span>
            </div>
            <p className="orch-wf-subtitle">
              Quản trị, trực quan hóa đồ thị Kahn không chu trình và phân bổ hàng đợi Worker phân tán
            </p>
          </div>
        </div>

        <div className="orch-wf-header-actions">
          {can("workflowWrite") && (
            <>
              <button
                type="button"
                className="orch-btn orch-btn-studio"
                onClick={() => nav("/workflows/studio")}
                title="Mở Visual Workflow Studio kéo thả trực quan"
              >
                <I name="layout-dashboard" size={16} />
                <span>Visual Studio</span>
              </button>
              <button
                type="button"
                className="orch-btn orch-btn-ai"
                onClick={() => setShowAiModal(true)}
                title="Sử dụng 9Router AI để thiết kế DAG bằng ngôn ngữ tự nhiên"
              >
                <I name="sparkles" size={16} />
                <span>AI Prompt-to-DAG</span>
              </button>
              <button
                type="button"
                className="orch-btn orch-btn-secondary"
                onClick={() => setShowCreateModal(true)}
                title="Khởi tạo bằng cách nhập JSON DAG"
              >
                <I name="plus" size={15} />
                <span>Nhập JSON</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* 2. Top Summary KPI Cards */}
      <div className="orch-wf-stats-grid">
        <div className="orch-wf-stat-card border-indigo">
          <div className="orch-wf-stat-icon indigo">
            <I name="git-fork" size={20} />
          </div>
          <div className="orch-wf-stat-info">
            <span className="orch-wf-stat-val">{totalWorkflows}</span>
            <span className="orch-wf-stat-label">Tổng Quy Trình</span>
          </div>
        </div>

        <div className="orch-wf-stat-card border-emerald">
          <div className="orch-wf-stat-icon emerald">
            <I name="activity" size={20} />
          </div>
          <div className="orch-wf-stat-info">
            <span className="orch-wf-stat-val">{activeWorkflows}</span>
            <span className="orch-wf-stat-label">Đang Hoạt Động</span>
          </div>
        </div>

        <div className="orch-wf-stat-card border-blue">
          <div className="orch-wf-stat-icon blue">
            <I name="network" size={20} />
          </div>
          <div className="orch-wf-stat-info">
            <span className="orch-wf-stat-val">{allQueues.length}</span>
            <span className="orch-wf-stat-label">Hàng Đợi Sử Dụng</span>
          </div>
        </div>

        <div className="orch-wf-stat-card border-purple">
          <div className="orch-wf-stat-icon purple">
            <I name="sparkles" size={20} />
          </div>
          <div className="orch-wf-stat-info">
            <span className="orch-wf-stat-val">{aiWorkflowsCount}</span>
            <span className="orch-wf-stat-label">Có Tác Vụ AI Agent</span>
          </div>
        </div>
      </div>

      {/* 3. Filter & Control Toolbar */}
      <div className="orch-wf-toolbar-card">
        {/* Quick Filter Segment Pills */}
        <div className="orch-wf-quick-tabs">
          <button
            type="button"
            className={`orch-wf-quick-tab ${quickFilter === "all" ? "active" : ""}`}
            onClick={() => setQuickFilter("all")}
          >
            Tất cả <span className="orch-quick-pill-num">{workflows.length}</span>
          </button>
          <button
            type="button"
            className={`orch-wf-quick-tab ${quickFilter === "ai" ? "active" : ""}`}
            onClick={() => setQuickFilter("ai")}
          >
            <I name="sparkles" size={13} /> Có AI Agent <span className="orch-quick-pill-num">{aiWorkflowsCount}</span>
          </button>
          <button
            type="button"
            className={`orch-wf-quick-tab ${quickFilter === "parallel" ? "active" : ""}`}
            onClick={() => setQuickFilter("parallel")}
          >
            <I name="zap" size={13} /> Nhánh Song Song <span className="orch-quick-pill-num">{parallelWorkflowsCount}</span>
          </button>
          <button
            type="button"
            className={`orch-wf-quick-tab ${quickFilter === "active" ? "active" : ""}`}
            onClick={() => setQuickFilter("active")}
          >
            ● Active <span className="orch-quick-pill-num">{activeWorkflows}</span>
          </button>
        </div>

        {/* Search, Filter, Sort & View Mode row */}
        <div className="orch-wf-controls-row">
          <div className="orch-wf-controls-left">
            <div className="orch-wf-search-box">
              <I name="search" size={15} />
              <input
                type="text"
                placeholder="Tìm kiếm theo tên quy trình hoặc mô tả nghiệp vụ..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="orch-wf-search-input"
              />
              {searchQuery && (
                <button
                  type="button"
                  className="orch-icon-btn xs"
                  onClick={() => setSearchQuery("")}
                  title="Xóa tìm kiếm"
                >
                  <I name="x" size={12} />
                </button>
              )}
            </div>

            <div className="orch-wf-select-wrap">
              <span className="orch-select-icon"><I name="filter" size={13} /></span>
              <select
                value={queueFilter}
                onChange={(e) => setQueueFilter(e.target.value)}
                className="orch-wf-select"
              >
                <option value="ALL">Tất cả hàng đợi ({allQueues.length})</option>
                {allQueues.map((q) => (
                  <option key={q} value={q}>Queue: {q}</option>
                ))}
              </select>
            </div>

            <div className="orch-wf-select-wrap">
              <span className="orch-select-icon"><I name="sliders-horizontal" size={13} /></span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="orch-wf-select"
              >
                <option value="newest">Mới nhất (ID ↓)</option>
                <option value="name">Tên A-Z</option>
                <option value="steps_desc">Nhiều bước nhất</option>
                <option value="steps_asc">Ít bước nhất</option>
              </select>
            </div>
          </div>

          <div className="orch-wf-controls-right">
            <span className="orch-wf-counter-text">
              Hiển thị: <strong>{filteredWorkflows.length}</strong> / {totalWorkflows} DAG
            </span>

            <div className="orch-view-segmented">
              <button
                type="button"
                className={`orch-view-seg-btn ${viewMode === "grid" ? "active" : ""}`}
                onClick={() => setViewMode("grid")}
                title="Chế độ thẻ trực quan"
              >
                <I name="columns-3" size={14} />
                <span>Thẻ</span>
              </button>
              <button
                type="button"
                className={`orch-view-seg-btn ${viewMode === "table" ? "active" : ""}`}
                onClick={() => setViewMode("table")}
                title="Chế độ bảng chi tiết"
              >
                <I name="list-filter" size={14} />
                <span>Bảng</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Main Body: Card Grid or Table View */}
      {filteredWorkflows.length === 0 ? (
        <div className="orch-empty-state-box">
          <div className="orch-empty-icon-ring">
            <I name="git-fork" size={32} />
          </div>
          <h3 className="orch-empty-title">
            {workflows.length === 0 ? "Chưa có Quy Trình nào được tạo" : "Không tìm thấy quy trình phù hợp"}
          </h3>
          <p className="orch-empty-desc">
            {workflows.length === 0
              ? "Hãy bắt đầu tạo quy trình DAG đầu tiên bằng Visual Workflow Studio hoặc AI Prompt-to-DAG."
              : "Thử xóa từ khóa tìm kiếm hoặc bỏ bộ lọc để hiển thị tất cả các quy trình."}
          </p>
          <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
            {workflows.length === 0 ? (
              <button type="button" className="orch-btn orch-btn-studio" onClick={() => nav("/workflows/studio")}>
                <I name="layout-dashboard" size={15} /> Mở Visual Studio
              </button>
            ) : (
              <button
                type="button"
                className="orch-btn orch-btn-secondary"
                onClick={() => {
                  setSearchQuery("");
                  setQueueFilter("ALL");
                  setQuickFilter("all");
                }}
              >
                <I name="rotate-ccw" size={14} /> Đặt lại bộ lọc
              </button>
            )}
          </div>
        </div>
      ) : viewMode === "grid" ? (
        /* --- CARD GRID VIEW --- */
        <div className="orch-wf-cards-grid">
          {filteredWorkflows.map((wf) => {
            const steps = wf.dag?.steps || [];
            const queues = Array.from(new Set(steps.map((s) => s.queue || "default")));
            const hasAi = steps.some((s) => s.type === "AI_AGENT_TASK");
            const stages = computeDagStages(steps);
            const hasParallel = stages.some((st) => st.isParallel);

            // Task type distribution count
            const typeCountsMap = {};
            steps.forEach((s) => {
              const t = s.type || "WORKER_TASK";
              typeCountsMap[t] = (typeCountsMap[t] || 0) + 1;
            });
            const typeCounts = Object.entries(typeCountsMap);

            // Theme badge styling
            const badgeTheme = hasAi ? "purple" : queues.includes("payment") ? "amber" : "indigo";
            const badgeIcon = hasAi ? "sparkles" : queues.includes("payment") ? "wallet" : "git-fork";

            return (
              <div key={wf.id} className="orch-wf-card-v3">
                {/* Header */}
                <div className="orch-wf-card-header">
                  <div className="orch-wf-card-header-left">
                    <div className={`orch-wf-icon-badge ${badgeTheme}`}>
                      <I name={badgeIcon} size={18} />
                    </div>
                    <div className="orch-wf-title-meta">
                      <h3 className="orch-wf-card-name" title={wf.name}>
                        {wf.name}
                      </h3>
                      <div className="orch-wf-tag-row">
                        <span className="orch-status-pill active">
                          <span className="orch-pulse-dot" /> Active
                        </span>
                        <span className="orch-version-pill">v{wf.version}</span>
                      </div>
                    </div>
                  </div>

                  <div className="orch-wf-header-micro-actions">
                    <button
                      type="button"
                      className="orch-icon-btn xs"
                      onClick={() => {
                        setSelectedWf(wf);
                        setDetailsTab("stages");
                      }}
                      title="Xem chi tiết đồ thị DAG"
                    >
                      <I name="eye" size={13} />
                    </button>
                    {can("workflowWrite") && (
                      <button
                        type="button"
                        className="orch-icon-btn xs danger"
                        onClick={() => handleDeleteWorkflow(wf.id, wf.name)}
                        title="Xóa quy trình này"
                      >
                        <I name="trash-2" size={13} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Description */}
                <p className="orch-wf-card-desc" title={wf.description}>
                  {wf.description || "Quy trình điều phối luồng phân tán thực thi trên nền tảng FlowForge."}
                </p>

                {/* Pipeline Visual Area */}
                <div className="orch-wf-pipeline-panel">
                  <div className="orch-wf-metric-pills">
                    <span className="orch-wf-metric-pill">
                      <I name="layers" size={12} /> {steps.length} Bước • {stages.length} Tầng
                    </span>
                    {hasParallel && (
                      <span className="orch-wf-metric-pill purple">
                        <I name="zap" size={11} /> Có nhánh song song
                      </span>
                    )}
                    {hasAi && (
                      <span className="orch-wf-metric-pill violet">
                        <I name="sparkles" size={11} /> AI Agent
                      </span>
                    )}
                  </div>

                  {/* Connected Stage Nodes Sequence */}
                  <div className="orch-wf-pipeline-preview">
                    {stages.slice(0, 5).map((stage, sIdx) => {
                      const isLastVisible = sIdx === Math.min(stages.length - 1, 4);
                      const stageIcon = stage.steps.some((s) => s.type === "AI_AGENT_TASK")
                        ? "sparkles"
                        : stage.steps.some((s) => s.type === "HTTP_TASK")
                        ? "globe"
                        : stage.steps.some((s) => s.type === "NOTIFICATION")
                        ? "bell"
                        : "cpu";

                      return (
                        <div key={stage.level} className="orch-wf-stage-node-item">
                          <div
                            className={`orch-wf-stage-node ${stage.isParallel ? "parallel" : ""}`}
                            title={`Tầng #${stage.level}: ${stage.steps.map((st) => st.name).join(", ")}`}
                          >
                            <I name={stageIcon} size={12} />
                            <span className="orch-wf-stage-num">
                              {stage.isParallel ? `⚡${stage.steps.length}x` : `T${stage.level}`}
                            </span>
                          </div>
                          {!isLastVisible && <div className="orch-wf-stage-line" />}
                        </div>
                      );
                    })}

                    {stages.length > 5 && (
                      <div className="orch-wf-stage-more" title={`Còn ${stages.length - 5} tầng tiếp theo`}>
                        +{stages.length - 5}
                      </div>
                    )}
                  </div>

                  {/* Task Type Summary Dots */}
                  <div className="orch-wf-types-bar">
                    {typeCounts.map(([type, count]) => (
                      <span key={type} className="orch-wf-type-tag" title={`${count} tác vụ ${type}`}>
                        <span className={`orch-type-dot ${type.toLowerCase()}`} />
                        <span>{count} {type.replace("_TASK", "").replace("NOTIFICATION", "NOTIF")}</span>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Footer: Queues & Main Actions */}
                <div className="orch-wf-card-footer">
                  <div className="orch-wf-queues-wrap" title={`Hàng đợi: ${queues.join(", ")}`}>
                    <span className="orch-wf-queues-label">Queue:</span>
                    {queues.slice(0, 2).map((q) => (
                      <code key={q} className="orch-queue-code">{q}</code>
                    ))}
                    {queues.length > 2 && (
                      <span className="orch-queue-more">+{queues.length - 2}</span>
                    )}
                  </div>

                  <div className="orch-wf-main-actions">
                    {can("executionTrigger") && (
                      <button
                        type="button"
                        className="orch-btn orch-btn-primary orch-btn-xs"
                        onClick={() => setTriggerModalWf(wf)}
                        title="Kích hoạt lượt chạy workflow này"
                      >
                        <I name="play" size={12} />
                        <span>Run</span>
                      </button>
                    )}
                    {can("workflowWrite") && (
                      <button
                        type="button"
                        className="orch-btn orch-btn-secondary orch-btn-xs"
                        onClick={() => nav("/workflows/studio", { state: { workflow: wf } })}
                        title="Mở trên Visual Workflow Studio"
                      >
                        <I name="layout-dashboard" size={12} />
                        <span>Studio</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* --- DENSE TABLE LIST VIEW --- */
        <div className="orch-card" style={{ padding: 0, overflow: "hidden" }}>
          <div className="orch-table-container">
            <table className="orch-table">
              <thead>
                <tr>
                  <th>Tên Quy Trình & Mô Tả</th>
                  <th>Cấu Trúc DAG</th>
                  <th>Phân Bổ Tác Vụ</th>
                  <th>Hàng Đợi Lắng Nghe</th>
                  <th>Phiên Bản</th>
                  <th>Trạng Thái</th>
                  <th style={{ textAlign: "right" }}>Thao Tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredWorkflows.map((wf) => {
                  const steps = wf.dag?.steps || [];
                  const queues = Array.from(new Set(steps.map((s) => s.queue || "default")));
                  const stages = computeDagStages(steps);
                  const hasParallel = stages.some((st) => st.isParallel);
                  const hasAi = steps.some((s) => s.type === "AI_AGENT_TASK");

                  return (
                    <tr key={wf.id} className="orch-table-row">
                      <td style={{ maxWidth: "280px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <span style={{ color: hasAi ? "var(--purple)" : "var(--primary)" }}>
                            <I name={hasAi ? "sparkles" : "git-fork"} size={17} />
                          </span>
                          <div>
                            <strong style={{ fontSize: "0.88rem", color: "var(--text-primary)" }}>{wf.name}</strong>
                            <p style={{ margin: "2px 0 0", fontSize: "0.75rem", color: "var(--text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "240px" }}>
                              {wf.description || "Không có mô tả"}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <span className="orch-tag blue" style={{ fontSize: "0.72rem", padding: "1px 7px" }}>
                            {steps.length} Steps ({stages.length} Stages)
                          </span>
                          {hasParallel && (
                            <span className="orch-tag purple" style={{ fontSize: "0.68rem", padding: "1px 6px" }}>
                              ⚡ Song song
                            </span>
                          )}
                        </div>
                      </td>

                      <td>
                        <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                          {steps.slice(0, 3).map((st) => (
                            <span key={st.id} className="orch-tag neutral" style={{ fontSize: "0.68rem", padding: "1px 5px" }}>
                              {st.type.replace("_TASK", "")}
                            </span>
                          ))}
                          {steps.length > 3 && (
                            <span style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>+{steps.length - 3}</span>
                          )}
                        </div>
                      </td>

                      <td>
                        <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                          {queues.map((q) => (
                            <code key={q} className="orch-queue-code">{q}</code>
                          ))}
                        </div>
                      </td>

                      <td>
                        <code className="orch-code-pill" style={{ fontSize: "0.72rem" }}>v{wf.version}</code>
                      </td>

                      <td>
                        <span className="orch-status-pill active" style={{ fontSize: "0.72rem" }}>
                          <span className="orch-pulse-dot" /> ACTIVE
                        </span>
                      </td>

                      <td style={{ textAlign: "right" }}>
                        <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                          {can("executionTrigger") && (
                            <button
                              type="button"
                              className="orch-btn orch-btn-primary orch-btn-xs"
                              onClick={() => setTriggerModalWf(wf)}
                              title="Chạy workflow"
                            >
                              <I name="play" size={12} /> Run
                            </button>
                          )}
                          {can("workflowWrite") && (
                            <button
                              type="button"
                              className="orch-btn orch-btn-secondary orch-btn-xs"
                              onClick={() => nav("/workflows/studio", { state: { workflow: wf } })}
                              title="Mở Studio"
                            >
                              <I name="layout-dashboard" size={12} /> Studio
                            </button>
                          )}
                          <button
                            type="button"
                            className="orch-icon-btn xs"
                            onClick={() => { setSelectedWf(wf); setDetailsTab("stages"); }}
                            title="Chi tiết DAG"
                          >
                            <I name="eye" size={13} />
                          </button>
                          {can("workflowWrite") && (
                            <button
                              type="button"
                              className="orch-icon-btn xs danger"
                              onClick={() => handleDeleteWorkflow(wf.id, wf.name)}
                              title="Xóa"
                            >
                              <I name="trash-2" size={13} />
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
      )}

      {/* 5. Modal: View DAG Details */}
      {selectedWf && (
        <div className="orch-modal-backdrop" onClick={() => setSelectedWf(null)}>
          <div className="orch-modal orch-modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="orch-modal-head">
              <div className="orch-modal-title-group">
                <div className="orch-modal-icon-badge blue"><I name="git-fork" size={20} /></div>
                <div>
                  <h3 className="orch-modal-title">{selectedWf.name}</h3>
                  <span className="orch-modal-subtitle">Định nghĩa chi tiết đồ thị DAG & phân bố hàng đợi (v{selectedWf.version})</span>
                </div>
              </div>
              <button className="orch-icon-btn" onClick={() => setSelectedWf(null)}>
                <I name="x" size={18} />
              </button>
            </div>

            {/* Modal Tabs */}
            <div style={{ display: "flex", gap: "8px", borderBottom: "1px solid var(--border)", padding: "0 24px" }}>
              <button
                type="button"
                className={`orch-btn orch-btn-sm ${detailsTab === "stages" ? "orch-btn-primary" : "orch-btn-ghost"}`}
                style={{ borderRadius: "0", borderBottom: detailsTab === "stages" ? "2px solid var(--primary)" : "none", padding: "10px 14px" }}
                onClick={() => setDetailsTab("stages")}
              >
                <I name="layers" size={14} /> Sơ Đồ Các Tầng Kahn (Stages)
              </button>
              <button
                type="button"
                className={`orch-btn orch-btn-sm ${detailsTab === "steps" ? "orch-btn-primary" : "orch-btn-ghost"}`}
                style={{ borderRadius: "0", borderBottom: detailsTab === "steps" ? "2px solid var(--primary)" : "none", padding: "10px 14px" }}
                onClick={() => setDetailsTab("steps")}
              >
                <I name="list-filter" size={14} /> Danh Sách Tác Vụ ({selectedWf.dag?.steps?.length || 0})
              </button>
              <button
                type="button"
                className={`orch-btn orch-btn-sm ${detailsTab === "json" ? "orch-btn-primary" : "orch-btn-ghost"}`}
                style={{ borderRadius: "0", borderBottom: detailsTab === "json" ? "2px solid var(--primary)" : "none", padding: "10px 14px" }}
                onClick={() => setDetailsTab("json")}
              >
                <I name="file-code" size={14} /> Schema JSON DAG
              </button>
            </div>

            <div className="orch-modal-body" style={{ maxHeight: "480px", overflowY: "auto", padding: "20px 24px" }}>
              {detailsTab === "stages" ? (
                <div>
                  <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginBottom: "14px" }}>
                    Các bước được gom thành các tầng thực thi theo giải thuật Kahn. Những bước ở cùng tầng có thể chạy song song độc lập.
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                    {computeDagStages(selectedWf.dag?.steps || []).map((stage, idx, arr) => (
                      <div key={stage.level} style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        <div
                          style={{
                            background: stage.isParallel ? "rgba(139, 92, 246, 0.05)" : "var(--bg-subtle)",
                            border: stage.isParallel ? "1px dashed #a78bfa" : "1px solid var(--border)",
                            borderRadius: "8px",
                            padding: "12px 14px",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                            <span style={{ fontSize: "0.76rem", fontWeight: 700, color: stage.isParallel ? "var(--purple)" : "var(--text-primary)" }}>
                              TẦNG #{stage.level}: {stage.isParallel ? `⚡ CHẠY SONG SONG (${stage.steps.length} NHÁNH)` : "THỰC THI TUẦN TỰ"}
                            </span>
                          </div>
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "8px" }}>
                            {stage.steps.map((st) => (
                              <div
                                key={st.id}
                                style={{
                                  background: "var(--bg-surface)",
                                  border: "1px solid var(--border)",
                                  borderRadius: "6px",
                                  padding: "8px 10px",
                                }}
                              >
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                                  <code style={{ fontSize: "0.7rem", color: "var(--primary)" }}>{st.id}</code>
                                  <span className="orch-tag neutral" style={{ fontSize: "0.6rem", padding: "1px 5px" }}>{st.type}</span>
                                </div>
                                <strong style={{ display: "block", fontSize: "0.82rem", color: "var(--text-primary)" }}>{st.name}</strong>
                                <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Queue: <code>{st.queue || "default"}</code></span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {idx < arr.length - 1 && (
                          <div style={{ display: "flex", justifyContent: "center", color: "var(--text-muted)", fontSize: "14px" }}>
                            <I name="arrow-right" size={14} style={{ transform: "rotate(90deg)" }} />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : detailsTab === "steps" ? (
                <div className="orch-steps-list-modal">
                  {(selectedWf.dag?.steps || []).map((step) => (
                    <div key={step.id} className="orch-step-detail-card" style={{ marginBottom: "10px", padding: "12px", border: "1px solid var(--border)", borderRadius: "8px", background: "var(--bg-surface)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <code className="orch-code-pill highlight">{step.id}</code>
                          <strong style={{ fontSize: "0.88rem" }}>{step.name}</strong>
                        </div>
                        <span className="orch-tag blue">{step.type}</span>
                      </div>
                      <div style={{ display: "flex", gap: "16px", fontSize: "0.75rem", color: "var(--text-secondary)", flexWrap: "wrap" }}>
                        <span>Queue: <code>{step.queue || "default"}</code></span>
                        <span>Retries: <strong>{step.maxRetries}</strong> lần</span>
                        <span>Timeout: <strong>{step.timeoutSeconds}</strong>s</span>
                        <span>
                          Phụ thuộc: {step.dependsOn?.length ? step.dependsOn.join(", ") : <em>(Root - Chạy ngay)</em>}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div>
                  <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "8px" }}>
                    <button
                      type="button"
                      className="orch-btn orch-btn-secondary orch-btn-xs"
                      onClick={() => handleCopyJson(selectedWf.dag)}
                    >
                      <I name="clipboard-list" size={13} /> Sao Chép JSON
                    </button>
                  </div>
                  <pre className="orch-code-block" style={{ maxHeight: "360px" }}>
                    {JSON.stringify(selectedWf.dag, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="orch-modal-actions">
              <button
                type="button"
                className="orch-btn orch-btn-secondary"
                onClick={() => setSelectedWf(null)}
              >
                Đóng
              </button>
              <button
                type="button"
                className="orch-btn orch-btn-primary"
                onClick={() => {
                  const wf = selectedWf;
                  setSelectedWf(null);
                  nav("/workflows/studio", { state: { workflow: wf } });
                }}
              >
                <I name="layout-dashboard" size={14} /> Mở Trên Visual Studio
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Modal: Trigger Run */}
      {triggerModalWf && (
        <div className="orch-modal-backdrop" onClick={() => setTriggerModalWf(null)}>
          <div className="orch-modal" style={{ maxWidth: "540px" }} onClick={(e) => e.stopPropagation()}>
            <div className="orch-modal-head">
              <div className="orch-modal-title-group">
                <div className="orch-modal-icon-badge blue"><I name="play" size={18} /></div>
                <div>
                  <h3 className="orch-modal-title">Kích Hoạt Chạy Workflow</h3>
                  <span className="orch-modal-subtitle">{triggerModalWf.name} (v{triggerModalWf.version})</span>
                </div>
              </div>
              <button className="orch-icon-btn" onClick={() => setTriggerModalWf(null)}>
                <I name="x" size={18} />
              </button>
            </div>
            <form onSubmit={handleTrigger} className="orch-modal-body">
              <label className="orch-form-label">Dữ liệu đầu vào (Input Payload JSON):</label>
              <p className="orch-form-hint">Dữ liệu sẽ được truyền vào các tác vụ khởi đầu (Root Steps)</p>
              <textarea
                rows={5}
                required
                value={inputPayload}
                onChange={(e) => setInputPayload(e.target.value)}
                className="orch-textarea-code"
              />
              <div className="orch-modal-actions" style={{ marginTop: "16px" }}>
                <button type="button" className="orch-btn orch-btn-secondary" onClick={() => setTriggerModalWf(null)}>
                  Hủy
                </button>
                <button type="submit" className="orch-btn orch-btn-primary">
                  <I name="play" size={14} /> Xác Nhận Chạy (Dispatch Run)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. Modal: Create JSON Workflow */}
      {showCreateModal && (
        <div className="orch-modal-backdrop" onClick={() => setShowCreateModal(false)}>
          <div className="orch-modal orch-modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="orch-modal-head">
              <div className="orch-modal-title-group">
                <div className="orch-modal-icon-badge blue"><I name="plus-circle" size={18} /></div>
                <div>
                  <h3 className="orch-modal-title">Nhập Định Nghĩa Workflow (JSON)</h3>
                  <span className="orch-modal-subtitle">Biên dịch đồ thị DAG trực tiếp từ mã JSON</span>
                </div>
              </div>
              <button className="orch-icon-btn" onClick={() => setShowCreateModal(false)}>
                <I name="x" size={18} />
              </button>
            </div>
            <form onSubmit={handleCreate} className="orch-modal-body">
              {aiReasoning && (
                <div className="orch-ai-reasoning-box" style={{ marginBottom: "14px", padding: "12px", background: "rgba(139, 92, 246, 0.08)", border: "1px solid #c4b5fd", borderRadius: "8px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--purple)", fontWeight: 700, marginBottom: "4px" }}>
                    <I name="sparkles" size={15} />
                    <span>Giải trình thiết kế của AI:</span>
                  </div>
                  <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--text-secondary)" }}>{aiReasoning}</p>
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
                <button type="button" className="orch-btn orch-btn-secondary" onClick={() => setShowCreateModal(false)}>
                  Hủy
                </button>
                <button type="submit" className="orch-btn orch-btn-primary">
                  <I name="save" size={15} /> Lưu & Biên Dịch DAG
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 8. Modal: AI Prompt-to-DAG */}
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
              <button className="orch-icon-btn" onClick={() => setShowAiModal(false)}>
                <I name="x" size={18} />
              </button>
            </div>
            <form onSubmit={handleAiGenerate} className="orch-modal-body">
              <label className="orch-form-label">Mô tả quy trình nghiệp vụ cần tạo:</label>
              <textarea
                rows={4}
                required
                placeholder="Ví dụ: Tạo quy trình xử lý đơn hàng gồm kiểm tra tồn kho và trừ tiền qua cổng payment song song, sau đó tạo hóa đơn và thông báo..."
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                className="orch-textarea"
              />

              <div className="orch-prompt-suggestions" style={{ marginTop: "12px" }}>
                <span className="orch-prompt-sugg-title" style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: "6px" }}>Gợi ý mẫu:</span>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {AI_SAMPLE_PROMPTS.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      className="orch-sugg-pill"
                      style={{ textAlign: "left", fontSize: "0.75rem", padding: "6px 10px", borderRadius: "6px", background: "var(--bg-subtle)", border: "1px solid var(--border)", cursor: "pointer", color: "var(--text-secondary)" }}
                      onClick={() => setAiPrompt(prompt)}
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>

              <div className="orch-modal-actions" style={{ marginTop: "20px" }}>
                <button type="button" className="orch-btn orch-btn-secondary" onClick={() => setShowAiModal(false)}>
                  Hủy
                </button>
                <button type="submit" className="orch-btn orch-btn-ai" disabled={aiLoading}>
                  <I name="sparkles" size={15} />
                  <span>{aiLoading ? "9Router đang phân rã & thiết kế DAG..." : "Thiết Kế Quy Trình"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
