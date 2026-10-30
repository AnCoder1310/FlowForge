import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useOrchestrator } from "../../../lib/store";
import { I } from "../../../lib/icons";
import { api } from "../../../lib/api";

/* =========================================
   HELPERS & DAG TOPOLOGICAL STAGING
========================================= */

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

/* =========================================
   REUSABLE KPI STAT CARD (MATCHES DASHBOARD)
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
   MAIN WORKFLOW DEFINITIONS PAGE
========================================= */

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

      // If user entered a very long prompt as the name, generate a concise title and put full text into description
      if (wfName.length > 70) {
        if (!wfDesc) {
          wfDesc = wfName;
        }
        const firstClause = wfName.split(/[\n.?!,;]/)[0].trim();
        wfName = firstClause.length > 60 ? firstClause.slice(0, 57) + "..." : (firstClause || "Quy-Trinh-DAG");
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
    <main className="dash-page">
      <style>{`
        /* =====================================
           WORKFLOW DEFINITIONS PAGE - THEMED TO DASHBOARD
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

        .dash-btn-xs {
          padding: 6px 10px;
          font-size: 11px;
          border-radius: 7px;
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

        /* TOOLBAR */
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
          padding-top: 14px;
          flex-wrap: wrap;
        }

        .dash-controls-left, .dash-controls-right {
          display: flex;
          align-items: center;
          gap: 10px;
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

        .dash-select-wrap {
          position: relative;
          display: flex;
          align-items: center;
        }

        .dash-select-icon {
          position: absolute;
          left: 10px;
          color: #94a3b8;
          pointer-events: none;
          display: flex;
        }

        .dash-select {
          height: 38px;
          padding: 0 28px 0 30px;
          border: 1px solid var(--dash-border);
          border-radius: 9px;
          background: #fff;
          color: #475569;
          font-size: 12px;
          outline: none;
          cursor: pointer;
        }

        .dash-select:focus {
          border-color: #67e8f9;
        }

        .dash-counter-text {
          color: #64748b;
          font-size: 12px;
          white-space: nowrap;
        }

        .dash-counter-text strong {
          color: var(--dash-primary-dark);
        }

        .dash-view-segmented {
          display: flex;
          gap: 3px;
          padding: 3px;
          background: #f1f5f9;
          border-radius: 9px;
        }

        .dash-view-seg-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 11px;
          border: 0;
          border-radius: 7px;
          background: transparent;
          color: #64748b;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
        }

        .dash-view-seg-btn.active {
          color: #0e7490;
          background: #fff;
          box-shadow: 0 1px 4px rgba(15,23,42,.10);
        }

        /* WORKFLOW CARDS GRID */
        .dash-wf-cards-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 18px;
        }

        .dash-wf-card {
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 14px;
          transition: transform .2s ease, box-shadow .2s ease;
        }

        .dash-wf-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 28px rgba(15,23,42,.07);
        }

        .dash-wf-card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
        }

        .dash-wf-card-header-left {
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 0;
        }

        .dash-wf-icon-badge {
          width: 42px;
          height: 42px;
          border-radius: 11px;
          display: grid;
          place-items: center;
          flex-shrink: 0;
        }

        .dash-wf-icon-badge.indigo { background: #eff6ff; color: #2563eb; }
        .dash-wf-icon-badge.purple { background: #f5f3ff; color: #7c3aed; }
        .dash-wf-icon-badge.amber { background: #fffbeb; color: #d97706; }

        .dash-wf-title-meta {
          min-width: 0;
        }

        .dash-wf-card-name {
          margin: 0;
          font-size: 14px;
          font-weight: 800;
          line-height: 1.35;
          color: var(--dash-text);
          overflow-wrap: anywhere;
        }

        .dash-wf-tag-row {
          display: flex;
          gap: 7px;
          align-items: center;
          margin-top: 6px;
        }

        .dash-status-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 3px 8px;
          border-radius: 99px;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: .025em;
        }

        .dash-status-pill.active {
          color: #047857;
          background: #ecfdf5;
        }

        .dash-version-pill {
          color: #64748b;
          background: #f1f5f9;
          border-radius: 6px;
          padding: 3px 7px;
          font-size: 10px;
          font-weight: 700;
        }

        .dash-wf-card-desc {
          margin: 0;
          color: var(--dash-muted);
          font-size: 12px;
          line-height: 1.55;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          min-height: 38px;
        }

        .dash-wf-pipeline-panel {
          padding: 14px;
          background: #f8fafc;
          border: 1px solid #edf2f7;
          border-radius: 11px;
        }

        .dash-wf-metric-pills {
          display: flex;
          gap: 7px;
          flex-wrap: wrap;
          margin-bottom: 12px;
        }

        .dash-wf-metric-pill {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 4px 8px;
          border-radius: 6px;
          background: #e0f2fe;
          color: #0369a1;
          font-size: 11px;
          font-weight: 750;
        }

        .dash-wf-metric-pill.purple {
          background: #f3e8ff;
          color: #7e22ce;
        }

        .dash-wf-metric-pill.violet {
          background: #ede9fe;
          color: #6d28d9;
        }

        .dash-wf-pipeline-preview {
          display: flex;
          align-items: center;
          gap: 0;
          min-height: 42px;
          overflow: hidden;
        }

        .dash-wf-stage-node-item {
          display: flex;
          align-items: center;
          flex: 0 0 auto;
        }

        .dash-wf-stage-node {
          min-width: 42px;
          height: 36px;
          padding: 0 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
          border: 1px solid #bae6fd;
          border-radius: 8px;
          background: #fff;
          color: #0284c7;
          font-size: 11px;
          font-weight: 750;
        }

        .dash-wf-stage-node.parallel {
          border: 1px dashed #c4b5fd;
          background: #faf5ff;
          color: #7c3aed;
        }

        .dash-wf-stage-line {
          width: 20px;
          height: 1px;
          background: #cbd5e1;
          flex: none;
        }

        .dash-wf-stage-more {
          padding: 5px 8px;
          border-radius: 7px;
          background: #e2e8f0;
          color: #475569;
          font-size: 11px;
          font-weight: 750;
        }

        .dash-wf-types-bar {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          margin-top: 12px;
          padding-top: 10px;
          border-top: 1px solid #e2e8f0;
        }

        .dash-wf-type-tag {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          color: #64748b;
          font-size: 11px;
          font-weight: 650;
        }

        .dash-type-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #94a3b8;
        }

        .dash-type-dot.ai_agent_task { background: #a78bfa; }
        .dash-type-dot.http_task { background: #38bdf8; }
        .dash-type-dot.worker_task { background: #34d399; }
        .dash-type-dot.notification { background: #fbbf24; }

        .dash-wf-card-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
          padding-top: 12px;
          border-top: 1px solid #f0f3f7;
        }

        .dash-wf-queues-wrap {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-wrap: wrap;
          min-width: 0;
        }

        .dash-wf-queues-label {
          color: #94a3b8;
          font-size: 11px;
          font-weight: 700;
        }

        .dash-queue-code {
          padding: 3px 6px;
          border: 1px solid var(--dash-border);
          border-radius: 5px;
          background: #f8fafc;
          color: #475569;
          font-size: 11px;
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        }

        .dash-wf-main-actions {
          display: flex;
          gap: 8px;
          flex-shrink: 0;
        }

        /* TABLE VIEW (MATCHES DASHBOARD TABLE) */
        .dash-table-wrapper {
          width: 100%;
          overflow-x: auto;
        }

        .dash-table {
          width: 100%;
          min-width: 860px;
          border-collapse: collapse;
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

        .dash-table tbody tr:hover {
          background: #fafcfe;
        }

        .dash-icon-btn {
          width: 32px;
          height: 32px;
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

        .dash-icon-btn.danger:hover {
          color: #dc2626;
          border-color: #fecaca;
          background: #fef2f2;
        }

        .dash-icon-btn.xs {
          width: 28px;
          height: 28px;
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
          width: min(100%, 940px);
        }

        .dash-modal-head {
          position: sticky;
          top: 0;
          z-index: 2;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
          padding: 20px 24px;
          background: #fff;
          border-bottom: 1px solid var(--dash-border);
        }

        .dash-modal-title-group {
          display: flex;
          align-items: flex-start;
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
          margin-top: 2px;
        }

        .dash-modal-icon-badge.blue { background: #eff6ff; color: #2563eb; }
        .dash-modal-icon-badge.purple { background: #f5f3ff; color: #7c3aed; }

        .dash-modal-title {
          margin: 0;
          font-size: 16px;
          font-weight: 800;
          line-height: 1.4;
          color: var(--dash-text);
          word-break: break-word;
        }

        .dash-modal-subtitle {
          display: block;
          margin-top: 4px;
          color: var(--dash-muted);
          font-size: 12px;
          line-height: 1.45;
          word-break: break-word;
        }

        .dash-modal-body {
          padding: 22px 24px;
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

        .dash-form-group {
          margin-bottom: 16px;
        }

        .dash-form-label {
          display: block;
          margin-bottom: 7px;
          color: #334155;
          font-size: 12px;
          font-weight: 750;
        }

        .dash-form-hint {
          margin: -3px 0 7px;
          color: #94a3b8;
          font-size: 11px;
        }

        .dash-input, .dash-textarea, .dash-textarea-code {
          width: 100%;
          padding: 10px 13px;
          border: 1px solid var(--dash-border);
          border-radius: 9px;
          background: #fff;
          color: #334155;
          font-size: 12px;
          outline: none;
        }

        .dash-input:focus, .dash-textarea:focus, .dash-textarea-code:focus {
          border-color: #22d3ee;
          box-shadow: 0 0 0 3px rgba(6,182,212,.10);
        }

        .dash-textarea, .dash-textarea-code {
          resize: vertical;
          line-height: 1.55;
        }

        .dash-textarea-code {
          background: #0f172a;
          color: #dbeafe;
          border-color: #1e293b;
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
          font-size: 12px;
        }

        .dash-code-block {
          padding: 14px;
          border-radius: 10px;
          background: #0f172a;
          color: #dbeafe;
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
          font-size: 12px;
          line-height: 1.55;
          overflow: auto;
        }

        @media (max-width: 1100px) {
          .dash-stats-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .dash-wf-cards-grid { grid-template-columns: 1fr; }
        }

        @media (max-width: 650px) {
          .dash-page { padding: 16px; gap: 18px; }
          .dash-page-header { flex-direction: column; align-items: flex-start; }
          .dash-page-header h1 { font-size: 25px; }
          .dash-header-actions { width: 100%; }
          .dash-header-actions button { flex: 1; }
          .dash-stats-grid { gap: 10px; }
          .dash-controls-row { flex-direction: column; align-items: stretch; }
          .dash-controls-left, .dash-controls-right { width: 100%; }
          .dash-search-box { width: 100%; min-width: 100%; }
          .dash-select { width: 100%; }
          .dash-wf-card-footer { flex-direction: column; align-items: flex-start; }
          .dash-wf-main-actions { width: 100%; }
          .dash-wf-main-actions button { flex: 1; }
        }
      `}</style>

      {/* =====================================
          1. PAGE HEADER (MATCHES DASHBOARD)
      ===================================== */}
      <header className="dash-page-header">
        <div>
          <div className="dash-eyebrow">
            <span className="dash-live-dot" />
            WORKFLOW DEFINITIONS &amp; DAG ORCHESTRATION
          </div>
          <h1>Quy Trình &amp; Đồ Thị DAG</h1>
          <p>
            Quản trị, trực quan hóa đồ thị Kahn không chu trình và phân bổ hàng đợi Worker phân tán.
          </p>
        </div>

        <div className="dash-header-actions">
          {can("workflowWrite") && (
            <>
              <button
                type="button"
                className="dash-btn dash-btn-outline"
                onClick={() => nav("/workflows/studio")}
                title="Mở Visual Workflow Studio kéo thả trực quan"
              >
                <I name="layout-dashboard" size={15} />
                <span>Visual Studio</span>
              </button>
              <button
                type="button"
                className="dash-btn dash-btn-outline"
                onClick={() => setShowAiModal(true)}
                title="Sử dụng 9Router AI để thiết kế DAG bằng ngôn ngữ tự nhiên"
              >
                <I name="sparkles" size={15} />
                <span>AI Prompt-to-DAG</span>
              </button>
              <button
                type="button"
                className="dash-btn dash-btn-primary"
                onClick={() => setShowCreateModal(true)}
                title="Khởi tạo bằng cách nhập JSON DAG"
              >
                <I name="plus" size={15} />
                <span>Nhập JSON</span>
              </button>
            </>
          )}
        </div>
      </header>

      {/* =====================================
          2. KPI SECTION (MATCHES DASHBOARD)
      ===================================== */}
      <section className="dash-stats-grid">
        <StatCard
          icon="git-fork"
          label="Tổng Quy Trình"
          value={totalWorkflows}
          description="DAG Blueprints trong hệ thống"
          variant="blue"
          footer={
            <span className="dash-mini-badge">
              {activeWorkflows} đang hoạt động
            </span>
          }
        />

        <StatCard
          icon="sparkles"
          label="Có AI Agent"
          value={aiWorkflowsCount}
          description="Quy trình tích hợp tác vụ AI"
          variant="cyan"
          footer={
            <span className="dash-mini-badge">
              Queue: ai-agent
            </span>
          }
        />

        <StatCard
          icon="pie-chart"
          label="Nhánh Song Song"
          value={parallelWorkflowsCount}
          description="Phân tầng Kahn song song"
          variant="purple"
          footer={
            <span className="dash-mini-badge">
              Kahn Topological Layers
            </span>
          }
        />

        <StatCard
          icon="server"
          label="Hàng Đợi Sử Dụng"
          value={allQueues.length}
          description="Worker Queues được phân bổ"
          variant="orange"
          footer={
            <span className="dash-mini-badge">
              {allQueues.slice(0, 3).join(", ")}{allQueues.length > 3 ? "..." : ""}
            </span>
          }
        />
      </section>

      {/* =====================================
          3. FILTER & TOOLBAR PANEL
      ===================================== */}
      <section className="dash-panel" style={{ padding: "16px 18px" }}>
        {/* Quick Tabs */}
        <div className="dash-quick-tabs">
          <button
            type="button"
            className={`dash-quick-tab ${quickFilter === "all" ? "active" : ""}`}
            onClick={() => setQuickFilter("all")}
          >
            Tất cả <span className="dash-pill-num">{workflows.length}</span>
          </button>
          <button
            type="button"
            className={`dash-quick-tab ${quickFilter === "ai" ? "active" : ""}`}
            onClick={() => setQuickFilter("ai")}
          >
            <I name="sparkles" size={13} /> Có AI Agent <span className="dash-pill-num">{aiWorkflowsCount}</span>
          </button>
          <button
            type="button"
            className={`dash-quick-tab ${quickFilter === "parallel" ? "active" : ""}`}
            onClick={() => setQuickFilter("parallel")}
          >
            <I name="zap" size={13} /> Nhánh Song Song <span className="dash-pill-num">{parallelWorkflowsCount}</span>
          </button>
          <button
            type="button"
            className={`dash-quick-tab ${quickFilter === "active" ? "active" : ""}`}
            onClick={() => setQuickFilter("active")}
          >
            ● Active <span className="dash-pill-num">{activeWorkflows}</span>
          </button>
        </div>

        {/* Filter Controls Row */}
        <div className="dash-controls-row">
          <div className="dash-controls-left">
            <div className="dash-search-box">
              <I name="search" size={15} />
              <input
                type="text"
                placeholder="Tìm kiếm theo tên quy trình hoặc mô tả nghiệp vụ..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="dash-search-input"
              />
              {searchQuery && (
                <button
                  type="button"
                  className="dash-icon-btn xs"
                  onClick={() => setSearchQuery("")}
                  title="Xóa tìm kiếm"
                >
                  <I name="x" size={12} />
                </button>
              )}
            </div>

            <div className="dash-select-wrap">
              <span className="dash-select-icon"><I name="filter" size={13} /></span>
              <select
                value={queueFilter}
                onChange={(e) => setQueueFilter(e.target.value)}
                className="dash-select"
              >
                <option value="ALL">Tất cả hàng đợi ({allQueues.length})</option>
                {allQueues.map((q) => (
                  <option key={q} value={q}>Queue: {q}</option>
                ))}
              </select>
            </div>

            <div className="dash-select-wrap">
              <span className="dash-select-icon"><I name="sliders-horizontal" size={13} /></span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="dash-select"
              >
                <option value="newest">Mới nhất (ID ↓)</option>
                <option value="name">Tên A-Z</option>
                <option value="steps_desc">Nhiều bước nhất</option>
                <option value="steps_asc">Ít bước nhất</option>
              </select>
            </div>
          </div>

          <div className="dash-controls-right">
            <span className="dash-counter-text">
              Hiển thị: <strong>{filteredWorkflows.length}</strong> / {totalWorkflows} DAG
            </span>

            <div className="dash-view-segmented">
              <button
                type="button"
                className={`dash-view-seg-btn ${viewMode === "grid" ? "active" : ""}`}
                onClick={() => setViewMode("grid")}
                title="Chế độ thẻ trực quan"
              >
                <I name="columns-3" size={14} />
                <span>Thẻ</span>
              </button>
              <button
                type="button"
                className={`dash-view-seg-btn ${viewMode === "table" ? "active" : ""}`}
                onClick={() => setViewMode("table")}
                title="Chế độ bảng chi tiết"
              >
                <I name="list-filter" size={14} />
                <span>Bảng</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================
          4. MAIN CONTENT: CARDS GRID OR TABLE
      ===================================== */}
      {filteredWorkflows.length === 0 ? (
        <div className="dash-panel" style={{ textAlign: "center", padding: "60px 20px" }}>
          <div style={{ width: "58px", height: "58px", borderRadius: "16px", background: "#ecfeff", color: "#0891b2", display: "grid", placeItems: "center", margin: "0 auto 16px" }}>
            <I name="git-fork" size={28} />
          </div>
          <h3 style={{ margin: "0 0 8px", fontSize: "16px", fontWeight: 800 }}>
            {workflows.length === 0 ? "Chưa có Quy Trình nào được tạo" : "Không tìm thấy quy trình phù hợp"}
          </h3>
          <p style={{ margin: "0 auto 20px", maxWidth: "460px", color: "var(--dash-muted)", fontSize: "12px", lineHeight: 1.6 }}>
            {workflows.length === 0
              ? "Hãy bắt đầu tạo quy trình DAG đầu tiên bằng Visual Workflow Studio hoặc AI Prompt-to-DAG."
              : "Thử xóa từ khóa tìm kiếm hoặc bỏ bộ lọc để hiển thị tất cả các quy trình."}
          </p>
          <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
            {workflows.length === 0 ? (
              <button type="button" className="dash-btn dash-btn-primary" onClick={() => nav("/workflows/studio")}>
                <I name="layout-dashboard" size={15} /> Mở Visual Studio
              </button>
            ) : (
              <button
                type="button"
                className="dash-btn dash-btn-outline"
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
        <div className="dash-wf-cards-grid">
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
              <article key={wf.id} className="dash-panel dash-wf-card">
                {/* Header */}
                <div className="dash-wf-card-header">
                  <div className="dash-wf-card-header-left">
                    <div className={`dash-wf-icon-badge ${badgeTheme}`}>
                      <I name={badgeIcon} size={20} />
                    </div>
                    <div className="dash-wf-title-meta">
                      <h3 className="dash-wf-card-name" title={wf.name}>
                        {wf.name}
                      </h3>
                      <div className="dash-wf-tag-row">
                        <span className="dash-status-pill active">
                          <span className="dash-live-dot" style={{ width: "6px", height: "6px", boxShadow: "none" }} /> Active
                        </span>
                        <span className="dash-version-pill">v{wf.version}</span>
                        <span className="dash-validated" style={{ fontSize: "10px", padding: "2px 6px" }}>
                          <I name="check-circle" size={11} /> Validated
                        </span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "6px" }}>
                    <button
                      type="button"
                      className="dash-icon-btn xs"
                      onClick={() => {
                        setSelectedWf(wf);
                        setDetailsTab("stages");
                      }}
                      title="Xem chi tiết đồ thị DAG"
                    >
                      <I name="eye" size={14} />
                    </button>
                    {can("workflowWrite") && (
                      <button
                        type="button"
                        className="dash-icon-btn xs danger"
                        onClick={() => handleDeleteWorkflow(wf.id, wf.name)}
                        title="Xóa quy trình này"
                      >
                        <I name="trash-2" size={14} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Description */}
                <p className="dash-wf-card-desc" title={wf.description}>
                  {wf.description || "Quy trình điều phối luồng phân tán thực thi trên nền tảng FlowForge."}
                </p>

                {/* Pipeline Visual Area */}
                <div className="dash-wf-pipeline-panel">
                  <div className="dash-wf-metric-pills">
                    <span className="dash-wf-metric-pill">
                      <I name="layers" size={12} /> {steps.length} Bước • {stages.length} Tầng
                    </span>
                    {hasParallel && (
                      <span className="dash-wf-metric-pill purple">
                        <I name="zap" size={11} /> Có nhánh song song
                      </span>
                    )}
                    {hasAi && (
                      <span className="dash-wf-metric-pill violet">
                        <I name="sparkles" size={11} /> AI Agent
                      </span>
                    )}
                  </div>

                  {/* Connected Stage Nodes Sequence */}
                  <div className="dash-wf-pipeline-preview">
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
                        <div key={stage.level} className="dash-wf-stage-node-item">
                          <div
                            className={`dash-wf-stage-node ${stage.isParallel ? "parallel" : ""}`}
                            title={`Tầng #${stage.level}: ${stage.steps.map((st) => st.name).join(", ")}`}
                          >
                            <I name={stageIcon} size={12} />
                            <span>
                              {stage.isParallel ? `⚡${stage.steps.length}x` : `T${stage.level}`}
                            </span>
                          </div>
                          {!isLastVisible && <div className="dash-wf-stage-line" />}
                        </div>
                      );
                    })}

                    {stages.length > 5 && (
                      <div className="dash-wf-stage-more" title={`Còn ${stages.length - 5} tầng tiếp theo`}>
                        +{stages.length - 5}
                      </div>
                    )}
                  </div>

                  {/* Task Type Summary Dots */}
                  <div className="dash-wf-types-bar">
                    {typeCounts.map(([type, count]) => (
                      <span key={type} className="dash-wf-type-tag" title={`${count} tác vụ ${type}`}>
                        <span className={`dash-type-dot ${type.toLowerCase()}`} />
                        <span>{count} {type.replace("_TASK", "").replace("NOTIFICATION", "NOTIF")}</span>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Footer: Queues & Main Actions */}
                <div className="dash-wf-card-footer">
                  <div className="dash-wf-queues-wrap" title={`Hàng đợi: ${queues.join(", ")}`}>
                    <span className="dash-wf-queues-label">Queue:</span>
                    {queues.slice(0, 2).map((q) => (
                      <code key={q} className="dash-queue-code">{q}</code>
                    ))}
                    {queues.length > 2 && (
                      <span style={{ fontSize: "11px", color: "var(--dash-muted)" }}>+{queues.length - 2}</span>
                    )}
                  </div>

                  <div className="dash-wf-main-actions">
                    {can("executionTrigger") && (
                      <button
                        type="button"
                        className="dash-btn dash-btn-primary dash-btn-xs"
                        onClick={() => setTriggerModalWf(wf)}
                        title="Kích hoạt lượt chạy workflow này"
                      >
                        <I name="play" size={13} />
                        <span>Run</span>
                      </button>
                    )}
                    {can("workflowWrite") && (
                      <button
                        type="button"
                        className="dash-btn dash-btn-outline dash-btn-xs"
                        onClick={() => nav("/workflows/studio", { state: { workflow: wf } })}
                        title="Mở trên Visual Workflow Studio"
                      >
                        <I name="layout-dashboard" size={13} />
                        <span>Studio</span>
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        /* --- DENSE TABLE LIST VIEW --- */
        <div className="dash-panel" style={{ padding: 0, overflow: "hidden" }}>
          <div className="dash-table-wrapper">
            <table className="dash-table">
              <thead>
                <tr>
                  <th>TÊN QUY TRÌNH &amp; MÔ TẢ</th>
                  <th>CẤU TRÚC DAG</th>
                  <th>PHÂN BỔ TÁC VỤ</th>
                  <th>HÀNG ĐỢI LẮNG NGHE</th>
                  <th>PHIÊN BẢN</th>
                  <th>TRẠNG THÁI</th>
                  <th style={{ textAlign: "right" }}>THAO TÁC</th>
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
                    <tr key={wf.id}>
                      <td style={{ maxWidth: "280px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <span style={{ color: hasAi ? "#7c3aed" : "var(--dash-primary)" }}>
                            <I name={hasAi ? "sparkles" : "git-fork"} size={18} />
                          </span>
                          <div>
                            <strong style={{ fontSize: "12px", color: "var(--dash-text)", display: "block" }}>{wf.name}</strong>
                            <p style={{ margin: "2px 0 0", fontSize: "11px", color: "var(--dash-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "240px" }}>
                              {wf.description || "Không có mô tả"}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <span className="dash-mini-badge" style={{ color: "#2563eb", background: "#eff6ff" }}>
                            {steps.length} Steps ({stages.length} Stages)
                          </span>
                          {hasParallel && (
                            <span className="dash-mini-badge" style={{ color: "#7c3aed", background: "#f5f3ff" }}>
                              ⚡ Song song
                            </span>
                          )}
                        </div>
                      </td>

                      <td>
                        <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                          {steps.slice(0, 3).map((st) => (
                            <span key={st.id} className="dash-mini-badge">
                              {st.type.replace("_TASK", "")}
                            </span>
                          ))}
                          {steps.length > 3 && (
                            <span style={{ fontSize: "10px", color: "var(--dash-muted)" }}>+{steps.length - 3}</span>
                          )}
                        </div>
                      </td>

                      <td>
                        <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                          {queues.map((q) => (
                            <code key={q} className="dash-queue-code">{q}</code>
                          ))}
                        </div>
                      </td>

                      <td>
                        <code className="dash-run-id" style={{ fontSize: "11px" }}>v{wf.version}</code>
                      </td>

                      <td>
                        <span className="dash-status-pill active" style={{ fontSize: "10px" }}>
                          <span className="dash-live-dot" style={{ width: "6px", height: "6px", boxShadow: "none" }} /> ACTIVE
                        </span>
                      </td>

                      <td style={{ textAlign: "right" }}>
                        <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                          {can("executionTrigger") && (
                            <button
                              type="button"
                              className="dash-btn dash-btn-primary dash-btn-xs"
                              onClick={() => setTriggerModalWf(wf)}
                              title="Chạy workflow"
                            >
                              <I name="play" size={12} /> Run
                            </button>
                          )}
                          {can("workflowWrite") && (
                            <button
                              type="button"
                              className="dash-btn dash-btn-outline dash-btn-xs"
                              onClick={() => nav("/workflows/studio", { state: { workflow: wf } })}
                              title="Mở Studio"
                            >
                              <I name="layout-dashboard" size={12} /> Studio
                            </button>
                          )}
                          <button
                            type="button"
                            className="dash-icon-btn xs"
                            onClick={() => { setSelectedWf(wf); setDetailsTab("stages"); }}
                            title="Chi tiết DAG"
                          >
                            <I name="eye" size={13} />
                          </button>
                          {can("workflowWrite") && (
                            <button
                              type="button"
                              className="dash-icon-btn xs danger"
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

      {/* =====================================
          5. MODAL: VIEW DAG DETAILS
      ===================================== */}
      {selectedWf && (
        <div className="dash-modal-backdrop" onClick={() => setSelectedWf(null)}>
          <div className="dash-modal dash-modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="dash-modal-head">
              <div className="dash-modal-title-group">
                <div className="dash-modal-icon-badge blue"><I name="git-fork" size={22} /></div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "3px" }}>
                    <h3
                      className="dash-modal-title"
                      title={selectedWf.name}
                      style={{
                        fontSize: selectedWf.name && selectedWf.name.length > 70 ? "15px" : "17px",
                        lineHeight: 1.35,
                        display: "-webkit-box",
                        WebkitLineClamp: selectedWf.name && selectedWf.name.length > 70 ? 2 : undefined,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                        wordBreak: "break-word",
                      }}
                    >
                      {selectedWf.name}
                    </h3>
                    <span className="dash-mini-badge" style={{ color: "#7c3aed", background: "#f5f3ff" }}>v{selectedWf.version}</span>
                  </div>
                  <span className="dash-modal-subtitle" title={selectedWf.description || ""}>
                    {selectedWf.description && selectedWf.description !== selectedWf.name
                      ? (selectedWf.description.length > 130 ? selectedWf.description.slice(0, 130) + "..." : selectedWf.description)
                      : "Định nghĩa chi tiết đồ thị DAG & phân bố hàng đợi"}
                  </span>
                </div>
              </div>
              <button className="dash-icon-btn" onClick={() => setSelectedWf(null)} title="Đóng modal">
                <I name="x" size={18} />
              </button>
            </div>

            {/* Modal Tabs */}
            <div style={{ display: "flex", gap: "8px", borderBottom: "1px solid var(--dash-border)", padding: "0 24px" }}>
              <button
                type="button"
                className={`dash-btn dash-btn-xs ${detailsTab === "stages" ? "dash-btn-primary" : "dash-btn-outline"}`}
                style={{ borderRadius: "0", borderBottom: detailsTab === "stages" ? "2px solid var(--dash-primary)" : "none", padding: "10px 14px", border: "none" }}
                onClick={() => setDetailsTab("stages")}
              >
                <I name="layers" size={14} /> Sơ Đồ Các Tầng Kahn (Stages)
              </button>
              <button
                type="button"
                className={`dash-btn dash-btn-xs ${detailsTab === "steps" ? "dash-btn-primary" : "dash-btn-outline"}`}
                style={{ borderRadius: "0", borderBottom: detailsTab === "steps" ? "2px solid var(--dash-primary)" : "none", padding: "10px 14px", border: "none" }}
                onClick={() => setDetailsTab("steps")}
              >
                <I name="list-filter" size={14} /> Danh Sách Tác Vụ ({selectedWf.dag?.steps?.length || 0})
              </button>
              <button
                type="button"
                className={`dash-btn dash-btn-xs ${detailsTab === "json" ? "dash-btn-primary" : "dash-btn-outline"}`}
                style={{ borderRadius: "0", borderBottom: detailsTab === "json" ? "2px solid var(--dash-primary)" : "none", padding: "10px 14px", border: "none" }}
                onClick={() => setDetailsTab("json")}
              >
                <I name="file-code" size={14} /> Schema JSON DAG
              </button>
            </div>

            <div className="dash-modal-body" style={{ maxHeight: "500px", overflowY: "auto" }}>
              {detailsTab === "stages" ? (
                <div>
                  <p style={{ fontSize: "12px", color: "var(--dash-muted)", marginBottom: "16px" }}>
                    Các bước được gom thành các tầng thực thi theo giải thuật Kahn. Những bước ở cùng tầng có thể chạy song song độc lập.
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                    {computeDagStages(selectedWf.dag?.steps || []).map((stage, idx, arr) => (
                      <div key={stage.level} style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        <div
                          style={{
                            background: stage.isParallel ? "rgba(139, 92, 246, 0.04)" : "#f8fafc",
                            border: stage.isParallel ? "1px dashed #a78bfa" : "1px solid var(--dash-border)",
                            borderRadius: "12px",
                            padding: "14px 16px",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
                            <span style={{ fontSize: "11px", fontWeight: 800, color: stage.isParallel ? "#7c3aed" : "var(--dash-text)" }}>
                              TẦNG #{stage.level}: {stage.isParallel ? `⚡ CHẠY SONG SONG (${stage.steps.length} NHÁNH)` : "THỰC THI TUẦN TỰ"}
                            </span>
                          </div>
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "10px" }}>
                            {stage.steps.map((st) => (
                              <div
                                key={st.id}
                                style={{
                                  background: "#fff",
                                  border: "1px solid var(--dash-border)",
                                  borderRadius: "9px",
                                  padding: "11px 13px",
                                  display: "flex",
                                  flexDirection: "column",
                                  gap: "5px",
                                  boxShadow: "0 1px 3px rgba(15,23,42,.03)",
                                }}
                              >
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px" }}>
                                  <code
                                    style={{
                                      fontSize: "11px",
                                      color: "var(--dash-primary-dark)",
                                      fontWeight: 700,
                                      whiteSpace: "nowrap",
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                      minWidth: 0,
                                      flex: 1,
                                    }}
                                    title={st.id}
                                  >
                                    {st.id}
                                  </code>
                                  <span
                                    className="dash-mini-badge"
                                    style={{
                                      fontSize: "10px",
                                      padding: "2px 6px",
                                      flexShrink: 0,
                                      whiteSpace: "nowrap",
                                    }}
                                  >
                                    {st.type}
                                  </span>
                                </div>
                                <strong
                                  style={{
                                    display: "block",
                                    fontSize: "12px",
                                    color: "var(--dash-text)",
                                    lineHeight: 1.35,
                                    wordBreak: "break-word",
                                  }}
                                >
                                  {st.name}
                                </strong>
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "2px", fontSize: "11px", color: "var(--dash-muted)" }}>
                                  <span>Queue: <code className="dash-queue-code">{st.queue || "default"}</code></span>
                                  {st.timeoutSeconds && (
                                    <span>{st.timeoutSeconds}s</span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {idx < arr.length - 1 && (
                          <div style={{ display: "flex", justifyContent: "center", color: "#94a3b8", fontSize: "14px" }}>
                            <I name="arrow-right" size={14} style={{ transform: "rotate(90deg)" }} />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : detailsTab === "steps" ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {(selectedWf.dag?.steps || []).map((step) => (
                    <div key={step.id} style={{ padding: "13px 15px", border: "1px solid var(--dash-border)", borderRadius: "10px", background: "#fff" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <code className="dash-run-id">{step.id}</code>
                          <strong style={{ fontSize: "13px", color: "var(--dash-text)" }}>{step.name}</strong>
                        </div>
                        <span className="dash-mini-badge" style={{ color: "#2563eb", background: "#eff6ff" }}>{step.type}</span>
                      </div>
                      <div style={{ display: "flex", gap: "16px", fontSize: "11px", color: "#64748b", flexWrap: "wrap", marginTop: "8px" }}>
                        <span>Queue: <code className="dash-queue-code">{step.queue || "default"}</code></span>
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
                  <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "10px" }}>
                    <button
                      type="button"
                      className="dash-btn dash-btn-outline dash-btn-xs"
                      onClick={() => handleCopyJson(selectedWf.dag)}
                    >
                      <I name="clipboard-list" size={13} /> Sao Chép JSON
                    </button>
                  </div>
                  <pre className="dash-code-block" style={{ maxHeight: "380px" }}>
                    {JSON.stringify(selectedWf.dag, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="dash-modal-actions">
              <button
                type="button"
                className="dash-btn dash-btn-outline"
                onClick={() => setSelectedWf(null)}
              >
                Đóng
              </button>
              <button
                type="button"
                className="dash-btn dash-btn-primary"
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

      {/* =====================================
          6. MODAL: TRIGGER RUN
      ===================================== */}
      {triggerModalWf && (
        <div className="dash-modal-backdrop" onClick={() => setTriggerModalWf(null)}>
          <div className="dash-modal" style={{ maxWidth: "540px" }} onClick={(e) => e.stopPropagation()}>
            <div className="dash-modal-head">
              <div className="dash-modal-title-group">
                <div className="dash-modal-icon-badge blue"><I name="play" size={18} /></div>
                <div>
                  <h3 className="dash-modal-title">Kích Hoạt Chạy Workflow</h3>
                  <span className="dash-modal-subtitle">{triggerModalWf.name} (v{triggerModalWf.version})</span>
                </div>
              </div>
              <button className="dash-icon-btn" onClick={() => setTriggerModalWf(null)}>
                <I name="x" size={18} />
              </button>
            </div>
            <form onSubmit={handleTrigger} className="dash-modal-body">
              <div className="dash-form-group">
                <label className="dash-form-label">Dữ liệu đầu vào (Input Payload JSON):</label>
                <p className="dash-form-hint">Dữ liệu sẽ được truyền vào các tác vụ khởi đầu (Root Steps)</p>
                <textarea
                  rows={5}
                  required
                  value={inputPayload}
                  onChange={(e) => setInputPayload(e.target.value)}
                  className="dash-textarea-code"
                />
              </div>
              <div className="dash-modal-actions" style={{ padding: "16px 0 0", background: "transparent", borderTop: "1px solid var(--dash-border)" }}>
                <button type="button" className="dash-btn dash-btn-outline" onClick={() => setTriggerModalWf(null)}>
                  Hủy
                </button>
                <button type="submit" className="dash-btn dash-btn-primary">
                  <I name="play" size={14} /> Xác Nhận Chạy (Dispatch Run)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================
          7. MODAL: CREATE JSON WORKFLOW
      ===================================== */}
      {showCreateModal && (
        <div className="dash-modal-backdrop" onClick={() => setShowCreateModal(false)}>
          <div className="dash-modal dash-modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="dash-modal-head">
              <div className="dash-modal-title-group">
                <div className="dash-modal-icon-badge blue"><I name="plus-circle" size={20} /></div>
                <div>
                  <h3 className="dash-modal-title">Nhập Định Nghĩa Workflow (JSON)</h3>
                  <span className="dash-modal-subtitle">Biên dịch đồ thị DAG trực tiếp từ mã JSON</span>
                </div>
              </div>
              <button className="dash-icon-btn" onClick={() => setShowCreateModal(false)}>
                <I name="x" size={18} />
              </button>
            </div>
            <form onSubmit={handleCreate} className="dash-modal-body">
              {aiReasoning && (
                <div style={{ marginBottom: "16px", padding: "13px 15px", background: "#f5f3ff", border: "1px solid #ddd6fe", borderRadius: "10px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#7c3aed", fontWeight: 750, fontSize: "12px", marginBottom: "4px" }}>
                    <I name="sparkles" size={15} />
                    <span>Giải trình thiết kế của AI:</span>
                  </div>
                  <p style={{ margin: 0, fontSize: "11px", color: "#64748b", lineHeight: 1.55 }}>{aiReasoning}</p>
                </div>
              )}
              <div className="dash-form-group">
                <label className="dash-form-label">Tên Workflow:</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Order-Fulfillment-DAG"
                  value={newWfName}
                  onChange={(e) => setNewWfName(e.target.value)}
                  className="dash-input"
                />
              </div>
              <div className="dash-form-group">
                <label className="dash-form-label">Mô tả mục đích:</label>
                <input
                  type="text"
                  placeholder="Mô tả chức năng của quy trình..."
                  value={newWfDesc}
                  onChange={(e) => setNewWfDesc(e.target.value)}
                  className="dash-input"
                />
              </div>
              <div className="dash-form-group">
                <label className="dash-form-label">Định nghĩa DAG Steps (JSON):</label>
                <p className="dash-form-hint">Mỗi step có queue, type, dependsOn và timeoutSeconds</p>
                <textarea
                  rows={8}
                  required
                  value={newWfStepsJson}
                  onChange={(e) => setNewWfStepsJson(e.target.value)}
                  className="dash-textarea-code"
                />
              </div>
              <div className="dash-modal-actions" style={{ padding: "16px 0 0", background: "transparent", borderTop: "1px solid var(--dash-border)" }}>
                <button type="button" className="dash-btn dash-btn-outline" onClick={() => setShowCreateModal(false)}>
                  Hủy
                </button>
                <button type="submit" className="dash-btn dash-btn-primary">
                  <I name="save" size={15} /> Lưu &amp; Biên Dịch DAG
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================
          8. MODAL: AI PROMPT-TO-DAG
      ===================================== */}
      {showAiModal && (
        <div className="dash-modal-backdrop" onClick={() => setShowAiModal(false)}>
          <div className="dash-modal" style={{ maxWidth: "620px" }} onClick={(e) => e.stopPropagation()}>
            <div className="dash-modal-head">
              <div className="dash-modal-title-group">
                <div className="dash-modal-icon-badge purple"><I name="sparkles" size={20} /></div>
                <div>
                  <h3 className="dash-modal-title">AI Prompt-to-DAG Generator</h3>
                  <span className="dash-modal-subtitle">Mô tả quy trình bằng ngôn ngữ tự nhiên để AI tự động xây dựng DAG</span>
                </div>
              </div>
              <button className="dash-icon-btn" onClick={() => setShowAiModal(false)}>
                <I name="x" size={18} />
              </button>
            </div>
            <form onSubmit={handleAiGenerate} className="dash-modal-body">
              <div className="dash-form-group">
                <label className="dash-form-label">Mô tả quy trình nghiệp vụ cần tạo:</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Ví dụ: Tạo quy trình xử lý đơn hàng gồm kiểm tra tồn kho và trừ tiền qua cổng payment song song, sau đó tạo hóa đơn và thông báo..."
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  className="dash-textarea"
                />
              </div>

              <div style={{ marginTop: "14px" }}>
                <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--dash-muted)", display: "block", marginBottom: "7px" }}>Gợi ý mẫu:</span>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {AI_SAMPLE_PROMPTS.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      style={{
                        textAlign: "left",
                        fontSize: "11px",
                        padding: "8px 11px",
                        borderRadius: "8px",
                        background: "#f8fafc",
                        border: "1px solid var(--dash-border)",
                        cursor: "pointer",
                        color: "#475569",
                        transition: ".15s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = "#67e8f9";
                        e.currentTarget.style.background = "#ecfeff";
                        e.currentTarget.style.color = "#0e7490";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = "var(--dash-border)";
                        e.currentTarget.style.background = "#f8fafc";
                        e.currentTarget.style.color = "#475569";
                      }}
                      onClick={() => setAiPrompt(prompt)}
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>

              <div className="dash-modal-actions" style={{ padding: "16px 0 0", background: "transparent", borderTop: "1px solid var(--dash-border)", marginTop: "18px" }}>
                <button type="button" className="dash-btn dash-btn-outline" onClick={() => setShowAiModal(false)}>
                  Hủy
                </button>
                <button type="submit" className="dash-btn dash-btn-primary" disabled={aiLoading}>
                  <I name="sparkles" size={15} />
                  <span>{aiLoading ? "9Router đang phân rã & thiết kế DAG..." : "Thiết Kế Quy Trình"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
