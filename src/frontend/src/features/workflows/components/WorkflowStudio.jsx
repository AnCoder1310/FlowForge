import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useOrchestrator } from "../../../lib/store";
import { I } from "../../../lib/icons";
import { api } from "../../../lib/api";

export const NODE_TYPES = [
  {
    type: "HTTP_TASK",
    name: "HTTP / Webhook Task",
    desc: "Gọi REST API, gửi webhook hoặc tích hợp bên ngoài",
    queue: "default",
    icon: "globe",
    color: "amber",
    defaultRetries: 2,
    defaultTimeout: 30,
  },
  {
    type: "WORKER_TASK",
    name: "Worker Task",
    desc: "Xử lý tính toán, ETL, biến đổi dữ liệu & thao tác CSDL",
    queue: "compute",
    icon: "cpu",
    color: "blue",
    defaultRetries: 3,
    defaultTimeout: 120,
  },
  {
    type: "AI_AGENT_TASK",
    name: "AI Agent Task",
    desc: "Phân tích cảm xúc, trích xuất dữ liệu, kiểm tra dị thường",
    queue: "ai-agent",
    icon: "sparkles",
    color: "purple",
    defaultRetries: 2,
    defaultTimeout: 90,
  },
  {
    type: "NOTIFICATION",
    name: "Notification Task",
    desc: "Gửi thông báo cảnh báo qua Slack, Email hoặc SMS",
    queue: "notification",
    icon: "bell",
    color: "emerald",
    defaultRetries: 1,
    defaultTimeout: 30,
  },
];

export const SUPPORTED_QUEUES = [
  "default",
  "compute",
  "data-io",
  "payment",
  "ai-agent",
  "notification",
  "inventory",
  "logistics",
  "documents",
  "ml-worker",
];

export const PRESET_TEMPLATES = [
  {
    id: "ecommerce",
    name: "E-Commerce Fulfillment",
    badge: "⚡ Song song 2 nhánh",
    desc: "Thanh toán & kho chạy song song, sau đó hội tụ chuẩn bị hàng và giao hàng",
    steps: [
      { id: "receive-order", name: "Receive Order", type: "HTTP_TASK", queue: "default", dependsOn: [], maxRetries: 2, timeoutSeconds: 30 },
      { id: "validate-order", name: "Validate Order", type: "WORKER_TASK", queue: "compute", dependsOn: ["receive-order"], maxRetries: 3, timeoutSeconds: 60 },
      { id: "check-payment", name: "Check Payment", type: "WORKER_TASK", queue: "data-io", dependsOn: ["validate-order"], maxRetries: 3, timeoutSeconds: 90 },
      { id: "check-inventory", name: "Check Inventory", type: "WORKER_TASK", queue: "data-io", dependsOn: ["validate-order"], maxRetries: 3, timeoutSeconds: 90 },
      { id: "prepare-order", name: "Prepare Order", type: "WORKER_TASK", queue: "compute", dependsOn: ["check-payment", "check-inventory"], maxRetries: 3, timeoutSeconds: 120 },
      { id: "ship-order", name: "Ship Order", type: "HTTP_TASK", queue: "default", dependsOn: ["prepare-order"], maxRetries: 2, timeoutSeconds: 60 },
      { id: "notify-customer", name: "Notify Customer", type: "NOTIFICATION", queue: "notification", dependsOn: ["ship-order"], maxRetries: 1, timeoutSeconds: 30 },
    ],
  },
  {
    id: "sentiment",
    name: "AI Customer Sentiment",
    badge: "🤖 Song song 2 nhánh",
    desc: "AI phân tích cảm xúc, song song tóm tắt điều hành & bắn Slack khẩn cấp",
    steps: [
      { id: "step-fetch-reviews", name: "Fetch Customer Reviews", type: "HTTP_TASK", queue: "default", dependsOn: [], maxRetries: 2, timeoutSeconds: 30 },
      { id: "step-ai-sentiment", name: "AI Sentiment & Topic Classification", type: "AI_AGENT_TASK", queue: "ai-agent", dependsOn: ["step-fetch-reviews"], maxRetries: 2, timeoutSeconds: 60 },
      { id: "step-ai-summary", name: "AI Executive Summary Generation", type: "AI_AGENT_TASK", queue: "ai-agent", dependsOn: ["step-ai-sentiment"], maxRetries: 2, timeoutSeconds: 90 },
      { id: "step-alert-escalate", name: "Escalate Urgent Issues to Slack", type: "HTTP_TASK", queue: "default", dependsOn: ["step-ai-sentiment"], maxRetries: 3, timeoutSeconds: 30 },
      { id: "step-persist-insights", name: "Store Analytics Insights", type: "WORKER_TASK", queue: "data-io", dependsOn: ["step-ai-summary", "step-alert-escalate"], maxRetries: 3, timeoutSeconds: 120 },
    ],
  },
  {
    id: "parquet-etl",
    name: "Distributed Parquet ETL",
    badge: "📊 Data Pipeline",
    desc: "Nạp Parquet, AI phát hiện dị thường dữ liệu, Spark phân tán và nạp Warehouse",
    steps: [
      { id: "step-ingest-source", name: "Ingest Raw Parquet Data", type: "WORKER_TASK", queue: "data-io", dependsOn: [], maxRetries: 3, timeoutSeconds: 300 },
      { id: "step-ai-quality-check", name: "AI Data Quality & Anomaly Detection", type: "AI_AGENT_TASK", queue: "ai-agent", dependsOn: ["step-ingest-source"], maxRetries: 2, timeoutSeconds: 180 },
      { id: "step-distributed-transform", name: "Distributed Spark/Polars Transform", type: "WORKER_TASK", queue: "compute", dependsOn: ["step-ai-quality-check"], maxRetries: 2, timeoutSeconds: 600 },
      { id: "step-load-warehouse", name: "Upsert to Analytical Warehouse", type: "WORKER_TASK", queue: "data-io", dependsOn: ["step-distributed-transform"], maxRetries: 3, timeoutSeconds: 300 },
    ],
  },
];

// Kahn's algorithm for cycle detection
export function validateDagKahn(nodes, edges) {
  const nodeIds = new Set(nodes.map((n) => n.id));
  const inDegree = {};
  const adj = {};

  nodeIds.forEach((id) => {
    inDegree[id] = 0;
    adj[id] = [];
  });

  for (const e of edges) {
    if (!nodeIds.has(e.from) || !nodeIds.has(e.to)) continue;
    if (e.from === e.to) {
      return { valid: false, error: `Tác vụ '${e.from}' không thể tự phụ thuộc vào chính nó.` };
    }
    adj[e.from].push(e.to);
    inDegree[e.to] = (inDegree[e.to] || 0) + 1;
  }

  const queue = Object.keys(inDegree).filter((id) => inDegree[id] === 0);
  let visitedCount = 0;

  while (queue.length > 0) {
    const u = queue.shift();
    visitedCount++;
    for (const v of adj[u]) {
      inDegree[v]--;
      if (inDegree[v] === 0) queue.push(v);
    }
  }

  if (visitedCount !== nodeIds.size) {
    return { valid: false, error: "Phát hiện chu trình lặp kín (Cycle) trong đồ thị DAG! Vui lòng ngắt bớt liên kết." };
  }
  return { valid: true };
}

// Convert DAG JSON to Nodes & Edges
export function dagToCanvas(dagSteps = []) {
  if (!dagSteps || dagSteps.length === 0) return { nodes: [], edges: [] };

  const levels = {};
  dagSteps.forEach((s) => {
    if (!s.dependsOn || s.dependsOn.length === 0) levels[s.id] = 0;
  });

  let changed = true;
  let it = 0;
  while (changed && it < dagSteps.length) {
    changed = false;
    it++;
    dagSteps.forEach((s) => {
      const deps = s.dependsOn || [];
      if (deps.length > 0) {
        const depLevels = deps.map((d) => levels[d]);
        if (depLevels.every((l) => l !== undefined)) {
          const maxL = Math.max(...depLevels);
          if (levels[s.id] !== maxL + 1) {
            levels[s.id] = maxL + 1;
            changed = true;
          }
        }
      }
    });
  }

  dagSteps.forEach((s, idx) => {
    if (levels[s.id] === undefined) levels[s.id] = idx;
  });

  // Calculate layout coordinates
  const levelCounts = {};
  const nodes = dagSteps.map((s) => {
    const lvl = levels[s.id] || 0;
    const yIdx = levelCounts[lvl] || 0;
    levelCounts[lvl] = yIdx + 1;

    return {
      id: s.id,
      name: s.name,
      type: s.type || "WORKER_TASK",
      queue: s.queue || "compute",
      maxRetries: s.maxRetries ?? 3,
      timeoutSeconds: s.timeoutSeconds ?? 120,
      x: 60 + lvl * 280,
      y: 60 + yIdx * 150,
    };
  });

  const edges = [];
  dagSteps.forEach((s) => {
    (s.dependsOn || []).forEach((depId) => {
      edges.push({ id: `e-${depId}-${s.id}`, from: depId, to: s.id });
    });
  });

  return { nodes, edges };
}

// Convert Canvas to FlowForge DAG JSON
export function canvasToDag(nodes, edges) {
  const steps = nodes.map((n) => {
    const upstream = edges.filter((e) => e.to === n.id).map((e) => e.from);
    return {
      id: n.id,
      name: n.name,
      type: n.type,
      queue: n.queue,
      dependsOn: Array.from(new Set(upstream)),
      maxRetries: n.maxRetries,
      timeoutSeconds: n.timeoutSeconds,
      configurationJson: null,
    };
  });
  return { steps };
}

export default function WorkflowStudio({ initialWorkflow = null, onClose = null }) {
  const { createWorkflow, updateWorkflow, triggerWorkflow, toast } = useOrchestrator();
  const nav = useNavigate();
  const loc = useLocation();
  const targetWorkflow = initialWorkflow || loc.state?.workflow || null;
  const isEditing = Boolean(targetWorkflow?.id);
  const editingId = targetWorkflow?.id || null;

  const [wfName, setWfName] = useState(targetWorkflow?.name || "New-Distributed-DAG");
  const [wfDesc, setWfDesc] = useState(initialWorkflow?.description || "Quy trình thiết kế trực quan trên Visual Studio");
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [connectingFromId, setConnectingFromId] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [draggingNodeId, setDraggingNodeId] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [searchFilter, setSearchFilter] = useState("");
  const [sidebarTab, setSidebarTab] = useState("tasks");
  const [showJsonPreview, setShowJsonPreview] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [validationResult, setValidationResult] = useState(null);

  const canvasRef = useRef(null);

  // Load preset template
  const handleLoadPreset = (preset) => {
    const { nodes: pNodes, edges: pEdges } = dagToCanvas(preset.steps);
    setNodes(pNodes);
    setEdges(pEdges);
    setWfName(preset.name);
    setWfDesc(preset.desc);
    setPan({ x: 0, y: 0 });
    setZoom(1);
    setValidationResult({ valid: true, msg: "Đồ thị DAG hợp lệ" });
    toast(`Đã áp dụng mẫu quy trình '${preset.name}' lên Canvas!`, "info");
  };

  // Initialize canvas
  useEffect(() => {
    if (targetWorkflow?.dag?.steps) {
      const { nodes: initNodes, edges: initEdges } = dagToCanvas(targetWorkflow.dag.steps);
      setNodes(initNodes);
      setEdges(initEdges);
      setWfName(targetWorkflow.name || "New-Distributed-DAG");
      setWfDesc(targetWorkflow.description || "");
    } else {
      const defaultSteps = [
        { id: "step-receive", name: "Receive Incoming Event", type: "HTTP_TASK", queue: "default", dependsOn: [], maxRetries: 2, timeoutSeconds: 30 },
        { id: "step-validate", name: "Validate & Verify Payload", type: "WORKER_TASK", queue: "compute", dependsOn: ["step-receive"], maxRetries: 3, timeoutSeconds: 60 },
        { id: "step-process", name: "Core Processing Pipeline", type: "WORKER_TASK", queue: "compute", dependsOn: ["step-validate"], maxRetries: 3, timeoutSeconds: 120 },
        { id: "step-notify", name: "Dispatch Completion Alert", type: "NOTIFICATION", queue: "notification", dependsOn: ["step-process"], maxRetries: 1, timeoutSeconds: 30 },
      ];
      const { nodes: initNodes, edges: initEdges } = dagToCanvas(defaultSteps);
      setNodes(initNodes);
      setEdges(initEdges);
    }
  }, [targetWorkflow]);

  // Keyboard shortcut: Delete / Backspace key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.key === "Delete" || e.key === "Backspace") && selectedNodeId) {
        if (!["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName)) {
          e.preventDefault();
          handleDeleteNode(selectedNodeId);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedNodeId, nodes, edges]);

  // Selected node object
  const selectedNode = nodes.find((n) => n.id === selectedNodeId) || null;

  // Add node from library
  const handleAddNode = (template) => {
    const count = nodes.filter((n) => n.type === template.type).length + 1;
    const baseSlug = template.type.toLowerCase().replace("_task", "").replace("_", "-");
    const newId = `${baseSlug}-${Date.now().toString().slice(-4)}`;
    const newNode = {
      id: newId,
      name: `${template.name.split(" ")[0]} #${count}`,
      type: template.type,
      queue: template.queue,
      maxRetries: template.defaultRetries,
      timeoutSeconds: template.defaultTimeout,
      x: 100 + (nodes.length % 4) * 80,
      y: 100 + (nodes.length % 4) * 80,
    };
    setNodes((prev) => [...prev, newNode]);
    setSelectedNodeId(newNode.id);
    setValidationResult(null);
    toast(`Đã thêm task '${newNode.name}' vào Canvas!`, "info");
  };

  // Node drag logic
  const handleNodeMouseDown = (e, nodeId) => {
    e.stopPropagation();
    setSelectedNodeId(nodeId);
    setDraggingNodeId(nodeId);
    const n = nodes.find((item) => item.id === nodeId);
    if (n) {
      setDragOffset({
        x: (e.clientX - pan.x) / zoom - n.x,
        y: (e.clientY - pan.y) / zoom - n.y,
      });
    }
  };

  // Canvas Pan logic
  const handleCanvasMouseDown = (e) => {
    if (e.target === canvasRef.current || e.target.tagName === "svg" || e.target.tagName === "rect") {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      setSelectedNodeId(null);
      setConnectingFromId(null);
    }
  };

  const handleMouseMove = (e) => {
    if (draggingNodeId) {
      const newX = Math.round(((e.clientX - pan.x) / zoom - dragOffset.x) / 10) * 10;
      const newY = Math.round(((e.clientY - pan.y) / zoom - dragOffset.y) / 10) * 10;
      setNodes((prev) =>
        prev.map((n) => (n.id === draggingNodeId ? { ...n, x: Math.max(20, newX), y: Math.max(20, newY) } : n))
      );
    } else if (isPanning) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setDraggingNodeId(null);
    setIsPanning(false);
  };

  // Connect logic (Click source handle then click target handle)
  const handleHandleClick = (e, nodeId, isSource) => {
    e.stopPropagation();
    if (isSource) {
      setConnectingFromId(nodeId);
      toast(`Đã chọn '${nodeId}'. Nhấp vào cổng vào (tròn xanh bên trái) của tác vụ tiếp theo!`, "info");
    } else {
      if (!connectingFromId) {
        toast("Vui lòng nhấp vào cổng ra (tròn xanh bên phải) của tác vụ chạy trước!", "warning");
        return;
      }
      if (connectingFromId === nodeId) {
        toast("Tác vụ không thể kết nối tới chính nó!", "danger");
        setConnectingFromId(null);
        return;
      }

      // Check if edge already exists
      const edgeId = `e-${connectingFromId}-${nodeId}`;
      if (edges.some((item) => item.from === connectingFromId && item.to === nodeId)) {
        toast("Liên kết dependency này đã tồn tại!", "warning");
        setConnectingFromId(null);
        return;
      }

      const newEdges = [...edges, { id: edgeId, from: connectingFromId, to: nodeId }];
      const check = validateDagKahn(nodes, newEdges);
      if (!check.valid) {
        toast(check.error, "danger");
        setConnectingFromId(null);
        return;
      }

      setEdges(newEdges);
      setValidationResult({ valid: true, msg: "Đồ thị DAG hợp lệ" });
      toast(`Đã kết nối: ${connectingFromId} → ${nodeId}`, "success");
      setConnectingFromId(null);
    }
  };

  // Delete node
  const handleDeleteNode = (nodeId) => {
    setNodes((prev) => prev.filter((n) => n.id !== nodeId));
    setEdges((prev) => prev.filter((e) => e.from !== nodeId && e.to !== nodeId));
    if (selectedNodeId === nodeId) setSelectedNodeId(null);
    setValidationResult(null);
    toast(`Đã xóa tác vụ #${nodeId}`);
  };

  // Delete edge
  const handleDeleteEdge = (edgeId) => {
    setEdges((prev) => prev.filter((e) => e.id !== edgeId));
    setValidationResult(null);
    toast("Đã gỡ bỏ dependency giữa 2 tác vụ!");
  };

  // Auto Layout
  const handleAutoLayout = () => {
    const dag = canvasToDag(nodes, edges);
    const { nodes: reNodes, edges: reEdges } = dagToCanvas(dag.steps);
    setNodes(reNodes);
    setEdges(reEdges);
    setPan({ x: 0, y: 0 });
    setZoom(1);
    toast("Đã tự động sắp xếp lại các nhánh DAG theo bậc phụ thuộc!", "success");
  };

  // Validate DAG
  const handleValidate = () => {
    if (nodes.length === 0) {
      toast("Vui lòng thêm ít nhất một tác vụ vào Canvas!", "danger");
      return false;
    }
    const check = validateDagKahn(nodes, edges);
    if (!check.valid) {
      setValidationResult({ valid: false, error: check.error });
      toast(check.error, "danger");
      return false;
    }
    setValidationResult({ valid: true, msg: `Đồ thị DAG hợp lệ (${nodes.length} tác vụ, ${edges.length} phụ thuộc)` });
    toast("Đồ thị DAG hoàn toàn hợp lệ (Chuẩn Kahn không chu trình)!", "success");
    return true;
  };

  // Save workflow to backend
  const handleSave = async () => {
    if (!handleValidate()) return;
    const dag = canvasToDag(nodes, edges);
    try {
      if (isEditing && updateWorkflow) {
        await updateWorkflow(editingId, {
          name: wfName.trim(),
          description: wfDesc.trim(),
          dag,
        });
        toast(`Đã cập nhật Workflow '${wfName}' (#${editingId}) thành công!`, "success");
      } else {
        await createWorkflow({
          name: wfName.trim(),
          description: wfDesc.trim(),
          dag,
        });
        toast(`Đã lưu Workflow '${wfName}' thành công vào hệ thống!`, "success");
      }
      if (onClose) onClose();
      else nav("/workflows");
    } catch (err) {
      toast(err.message || "Lỗi lưu workflow", "danger");
    }
  };

  // Run Workflow directly from Studio
  const handleRunWorkflow = async () => {
    if (!handleValidate()) return;
    const dag = canvasToDag(nodes, edges);
    try {
      const saved = await createWorkflow({
        name: wfName.trim(),
        description: wfDesc.trim(),
        dag,
      });
      await triggerWorkflow(saved.id, JSON.stringify({ source: "visual-studio-trigger", timestamp: Date.now() }));
      toast(`Đã khởi tạo và kích hoạt chạy workflow '${saved.name}'!`, "success");
      nav("/executions");
    } catch (err) {
      toast(err.message || "Lỗi kích hoạt workflow", "danger");
    }
  };

  // AI Prompt generation to Canvas
  const handleAiGenerateToCanvas = async (e) => {
    e.preventDefault();
    if (!aiPrompt.trim()) return;
    setAiLoading(true);
    try {
      const res = await api.post("/ai/generate-workflow", { prompt: aiPrompt });
      setWfName(res.name || "AI-Generated-Workflow");
      setWfDesc(res.description || "");
      if (res.dag?.steps) {
        const { nodes: aiNodes, edges: aiEdges } = dagToCanvas(res.dag.steps);
        setNodes(aiNodes);
        setEdges(aiEdges);
      }
      setShowAiModal(false);
      setPan({ x: 0, y: 0 });
      setZoom(1);
      toast("AI đã phân rã nghiệp vụ và đưa trực tiếp đồ thị DAG lên Canvas!", "success");
    } catch (err) {
      toast(err.message || "Lỗi AI sinh workflow", "danger");
    } finally {
      setAiLoading(false);
    }
  };

  const currentDagJson = JSON.stringify(canvasToDag(nodes, edges), null, 2);

  return (
    <div
      className="studio-root"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      <style>{`
        /* =====================================
           WORKFLOW STUDIO - DASHBOARD DESIGN SYSTEM
        ===================================== */

        .studio-root {
          --dash-primary: #0891b2;
          --dash-primary-dark: #0e7490;
          --dash-text: #172033;
          --dash-muted: #8490a3;
          --dash-border: #e8edf3;
          --dash-bg: #f6f8fb;

          display: flex;
          flex-direction: column;
          height: calc(100vh - var(--topbar-height, 68px));
          width: 100%;
          background: var(--dash-bg);
          overflow: hidden;
          user-select: none;
          position: relative;
          color: var(--dash-text);
          font-family: inherit;
        }

        .studio-root * {
          box-sizing: border-box;
        }

        /* HEADER */
        .studio-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 20px;
          border-bottom: 1px solid var(--dash-border);
          background: #fff;
          z-index: 20;
          height: 60px;
          gap: 16px;
          box-shadow: 0 1px 4px rgba(15,23,42,.03);
        }

        .studio-header-left {
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 0;
          flex: 1;
        }

        .studio-title-box {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
          flex: 1;
        }

        .studio-name-input {
          font-family: inherit;
          font-size: 15px;
          font-weight: 800;
          color: var(--dash-text);
          background: transparent;
          border: 1px solid transparent;
          border-radius: 8px;
          padding: 6px 10px;
          transition: all 0.2s ease;
          min-width: 240px;
          max-width: 440px;
        }

        .studio-name-input:hover {
          border-color: var(--dash-border);
          background: #f8fafc;
        }

        .studio-name-input:focus {
          border-color: var(--dash-primary);
          background: #fff;
          box-shadow: 0 0 0 3px rgba(8,145,178,.12);
          outline: none;
        }

        .studio-status-tag {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 3px 8px;
          border-radius: 6px;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: .3px;
          text-transform: uppercase;
          white-space: nowrap;
        }

        .studio-status-tag.valid {
          color: #059669;
          background: #ecfdf5;
          border: 1px solid #a7f3d0;
        }

        .studio-status-tag.invalid {
          color: #dc2626;
          background: #fef2f2;
          border: 1px solid #fecaca;
        }

        .studio-status-tag.draft {
          color: #64748b;
          background: #f1f5f9;
          border: 1px solid #e2e8f0;
        }

        .studio-header-actions {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-shrink: 0;
          flex-wrap: wrap;
        }

        /* BUTTONS */
        .dash-btn {
          display: inline-flex;
          justify-content: center;
          align-items: center;
          gap: 7px;
          padding: 8px 14px;
          border: 1px solid transparent;
          border-radius: 8px;
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
          box-shadow: 0 2px 8px rgba(8,145,178,.2);
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
          background: #ecfeff;
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

        .dash-btn-emerald {
          color: #fff;
          background: #10b981;
          box-shadow: 0 2px 8px rgba(16,185,129,.2);
        }

        .dash-btn-emerald:hover:not(:disabled) {
          background: #059669;
          transform: translateY(-1px);
        }

        .dash-btn-danger {
          color: #dc2626;
          background: #fef2f2;
          border: 1px solid #fee2e2;
        }

        .dash-btn-danger:hover:not(:disabled) {
          background: #fee2e2;
        }

        .dash-btn-xs {
          padding: 6px 11px;
          font-size: 11px;
          border-radius: 7px;
        }

        /* 3-COLUMN WORKSPACE */
        .studio-workspace {
          display: flex;
          flex: 1;
          overflow: hidden;
          position: relative;
        }

        /* LEFT SIDEBAR: PALETTE */
        .studio-sidebar {
          width: 290px;
          flex-shrink: 0;
          background: #fff;
          border-right: 1px solid var(--dash-border);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          z-index: 10;
        }

        .studio-sidebar-head {
          padding: 14px 16px 12px;
          border-bottom: 1px solid #f0f3f7;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .studio-tabs-toggle {
          display: flex;
          gap: 4px;
          padding: 3px;
          background: #f1f5f9;
          border-radius: 8px;
        }

        .studio-tab-btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 6px 10px;
          border: 0;
          border-radius: 6px;
          background: transparent;
          color: #64748b;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
          transition: .15s ease;
        }

        .studio-tab-btn.active {
          color: #0e7490;
          background: #fff;
          box-shadow: 0 1px 3px rgba(15,23,42,.08);
        }

        .studio-search-wrap {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #f8fafc;
          border: 1px solid var(--dash-border);
          border-radius: 8px;
          padding: 6px 10px;
          color: #94a3b8;
        }

        .studio-search-wrap:focus-within {
          border-color: #67e8f9;
          background: #fff;
          box-shadow: 0 0 0 2px rgba(8,145,178,.10);
        }

        .studio-search-input {
          border: none;
          background: transparent;
          color: #1e293b;
          font-size: 12px;
          outline: none;
          width: 100%;
        }

        .studio-node-list {
          flex: 1;
          overflow-y: auto;
          padding: 14px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .studio-node-pill {
          background: #fff;
          border: 1px solid var(--dash-border);
          border-radius: 11px;
          padding: 12px 14px;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          position: relative;
        }

        .studio-node-pill:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(15,23,42,.06);
          border-color: #a5f3fc;
        }

        .studio-node-pill.pill-amber { border-left: 4px solid #f59e0b; }
        .studio-node-pill.pill-blue { border-left: 4px solid #2563eb; }
        .studio-node-pill.pill-purple { border-left: 4px solid #7c3aed; }
        .studio-node-pill.pill-emerald { border-left: 4px solid #10b981; }

        .studio-node-pill-top {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 5px;
        }

        .studio-pill-icon {
          width: 26px;
          height: 26px;
          border-radius: 7px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

        .studio-pill-icon.amber { background: #fffbeb; color: #d97706; }
        .studio-pill-icon.blue { background: #eff6ff; color: #2563eb; }
        .studio-pill-icon.purple { background: #f5f3ff; color: #7c3aed; }
        .studio-pill-icon.emerald { background: #ecfdf5; color: #059669; }

        .studio-pill-name {
          font-size: 12px;
          font-weight: 750;
          color: #1e293b;
        }

        .studio-pill-desc {
          font-size: 11px;
          color: var(--dash-muted);
          line-height: 1.45;
          margin: 0 0 8px 0;
        }

        .studio-pill-meta {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 10px;
          color: #64748b;
        }

        .studio-pill-meta code {
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
          background: #f1f5f9;
          padding: 2px 5px;
          border-radius: 4px;
          color: #334155;
        }

        .studio-sidebar-footer {
          padding: 12px 14px;
          background: #ecfeff;
          border-top: 1px solid #cffafe;
        }

        .studio-hint {
          font-size: 11px;
          color: #0e7490;
          display: flex;
          align-items: flex-start;
          gap: 6px;
          line-height: 1.45;
        }

        /* CENTER: CANVAS */
        .studio-canvas-area {
          flex: 1;
          position: relative;
          overflow: hidden;
          background: #f8fafc;
          cursor: grab;
          user-select: none;
        }

        .studio-canvas-area:active {
          cursor: grabbing;
        }

        .studio-canvas-controls {
          position: absolute;
          bottom: 20px;
          left: 20px;
          z-index: 15;
          display: flex;
          align-items: center;
          gap: 4px;
          background: #fff;
          padding: 4px 8px;
          border-radius: 10px;
          border: 1px solid var(--dash-border);
          box-shadow: 0 4px 16px rgba(15,23,42,.08);
        }

        .studio-zoom-val {
          font-size: 11px;
          font-weight: 750;
          color: #475569;
          min-width: 44px;
          text-align: center;
        }

        .studio-svg-layer {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          overflow: visible;
          z-index: 2;
        }

        .studio-edge-group {
          pointer-events: auto;
        }

        .studio-edge-path {
          fill: none;
          stroke: #0891b2;
          stroke-width: 2.2px;
          transition: stroke 0.15s;
        }

        .studio-edge-hit {
          fill: none;
          stroke: transparent;
          stroke-width: 16px;
          cursor: pointer;
          pointer-events: stroke;
        }

        .studio-edge-hit:hover + .studio-edge-path,
        .studio-edge-group:hover .studio-edge-path {
          stroke: #ef4444;
          stroke-width: 3px;
        }

        .studio-nodes-layer {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          z-index: 5;
        }

        /* CANVAS NODE CARD */
        .studio-node-card {
          position: absolute;
          top: 0;
          left: 0;
          width: 205px;
          background: #fff;
          border: 1.5px solid var(--dash-border);
          border-radius: 12px;
          box-shadow: 0 3px 12px rgba(15,23,42,.05);
          padding: 10px 12px;
          cursor: move;
          pointer-events: auto;
          transition: box-shadow 0.15s, border-color 0.15s;
          user-select: none;
        }

        .studio-node-card.selected {
          border-color: #0891b2;
          box-shadow: 0 0 0 3px rgba(8,145,178,.22), 0 8px 24px rgba(15,23,42,.08);
        }

        .studio-node-card.connecting-source {
          border-color: #10b981;
          box-shadow: 0 0 0 3px rgba(16,185,129,.30);
        }

        .studio-node-card.card-amber { border-left: 4px solid #f59e0b; }
        .studio-node-card.card-blue { border-left: 4px solid #2563eb; }
        .studio-node-card.card-purple { border-left: 4px solid #7c3aed; }
        .studio-node-card.card-emerald { border-left: 4px solid #10b981; }

        .studio-handle {
          position: absolute;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: #ffffff;
          top: calc(50% - 7px);
          cursor: crosshair;
          transition: transform 0.15s, background-color 0.15s;
          z-index: 10;
        }

        .studio-handle.handle-in {
          left: -8px;
          border: 2.5px solid #2563eb;
        }

        .studio-handle.handle-out {
          right: -8px;
          border: 2.5px solid #10b981;
        }

        .studio-handle:hover {
          transform: scale(1.35);
          background: #10b981;
        }

        .studio-handle.active {
          background: #10b981;
          transform: scale(1.3);
        }

        .studio-node-card-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 6px;
        }

        .studio-node-badge {
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 10px;
          font-weight: 800;
          text-transform: uppercase;
          color: #64748b;
        }

        .studio-node-card-body {
          margin-bottom: 8px;
        }

        .studio-node-name {
          display: block;
          font-size: 12px;
          font-weight: 750;
          color: #1e293b;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          line-height: 1.35;
        }

        .studio-node-id {
          display: block;
          font-size: 10px;
          color: #94a3b8;
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
          margin-top: 2px;
        }

        .studio-node-card-foot {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 10px;
          color: #64748b;
          border-top: 1px solid #f0f3f7;
          padding-top: 6px;
        }

        .studio-queue-pill {
          background: #f1f5f9;
          padding: 2px 5px;
          border-radius: 4px;
          font-weight: 600;
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
          color: #475569;
        }

        .studio-retry-pill {
          color: #94a3b8;
          font-weight: 600;
        }

        /* RIGHT: CONFIG PANEL */
        .studio-config-panel {
          width: 330px;
          flex-shrink: 0;
          background: #fff;
          border-left: 1px solid var(--dash-border);
          overflow-y: auto;
          z-index: 10;
          padding: 18px 20px;
        }

        .studio-config-body {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .studio-config-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          padding-bottom: 12px;
          border-bottom: 1px solid #f0f3f7;
        }

        .studio-config-title {
          font-size: 14px;
          font-weight: 800;
          color: #1e293b;
          margin: 0;
        }

        .studio-config-sub {
          font-size: 11px;
          color: var(--dash-muted);
          margin-top: 2px;
        }

        .studio-form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .studio-form-label {
          color: #334155;
          font-size: 11px;
          font-weight: 750;
        }

        .studio-input, .studio-select {
          width: 100%;
          height: 38px;
          padding: 0 12px;
          border: 1px solid var(--dash-border);
          border-radius: 8px;
          background: #fff;
          color: #1e293b;
          font-size: 12px;
          outline: none;
          transition: border-color .15s ease;
        }

        .studio-input:focus, .studio-select:focus {
          border-color: var(--dash-primary);
          box-shadow: 0 0 0 3px rgba(8,145,178,.12);
        }

        .studio-input.disabled {
          background: #f8fafc;
          color: #64748b;
          cursor: not-allowed;
        }

        .studio-form-row {
          display: flex;
          gap: 10px;
        }

        .studio-deps-list {
          display: flex;
          flex-direction: column;
          gap: 6px;
          max-height: 180px;
          overflow-y: auto;
          padding: 8px;
          background: #f8fafc;
          border: 1px solid var(--dash-border);
          border-radius: 8px;
        }

        .studio-dep-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 11px;
          color: #334155;
          cursor: pointer;
        }

        .studio-dep-item code {
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
          color: #64748b;
          font-size: 10px;
        }

        .studio-config-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 20px;
          text-align: center;
          color: #94a3b8;
        }

        .studio-config-empty h4 {
          margin: 12px 0 6px;
          font-size: 14px;
          font-weight: 750;
          color: #475569;
        }

        .studio-config-empty p {
          margin: 0;
          font-size: 12px;
          line-height: 1.5;
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

        .dash-icon-btn.xs {
          width: 24px;
          height: 24px;
        }

        /* MODALS (MATCHES DASHBOARD / WORKFLOWS) */
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
          width: min(100%, 860px);
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
        .dash-modal-icon-badge.purple { background: #f5f3ff; color: #7c3aed; }

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

        .dash-code-block {
          padding: 14px 16px;
          background: #0f172a;
          color: #f8fafc;
          border-radius: 10px;
          font-size: 12px;
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
          line-height: 1.5;
          overflow-x: auto;
          max-height: 400px;
        }

        .dash-textarea {
          width: 100%;
          padding: 12px 14px;
          border: 1px solid var(--dash-border);
          border-radius: 10px;
          font-size: 13px;
          font-family: inherit;
          color: #1e293b;
          resize: vertical;
          outline: none;
          line-height: 1.5;
        }

        .dash-textarea:focus {
          border-color: var(--dash-primary);
          box-shadow: 0 0 0 3px rgba(8,145,178,.12);
        }
      `}</style>

      {/* =====================================
          STUDIO HEADER BAR
      ===================================== */}
      <header className="studio-header">
        <div className="studio-header-left">
          <button
            type="button"
            className="dash-btn dash-btn-outline dash-btn-xs"
            onClick={onClose ? onClose : () => nav("/workflows")}
            title="Quay lại danh sách Workflow"
          >
            <I name="arrow-right" size={13} style={{ transform: "rotate(180deg)" }} />
            <span>Quay lại</span>
          </button>

          <div className="studio-title-box">
            <input
              type="text"
              value={wfName}
              onChange={(e) => setWfName(e.target.value)}
              className="studio-name-input"
              placeholder="Tên Workflow..."
            />

            <span
              className={`studio-status-tag ${
                validationResult?.valid
                  ? "valid"
                  : validationResult?.valid === false
                  ? "invalid"
                  : "draft"
              }`}
            >
              {validationResult?.valid
                ? "DAG Hợp Lệ"
                : validationResult?.valid === false
                ? "Lỗi Chu Trình"
                : "Bản Thảo (Draft)"}
            </span>
          </div>
        </div>

        <div className="studio-header-actions">
          <button
            type="button"
            className="dash-btn dash-btn-ai dash-btn-xs"
            onClick={() => setShowAiModal(true)}
          >
            <I name="sparkles" size={13} />
            <span>AI Prompt-to-DAG</span>
          </button>

          <button
            type="button"
            className="dash-btn dash-btn-outline dash-btn-xs"
            onClick={handleAutoLayout}
            title="Căn chỉnh các nhánh tự động"
          >
            <I name="layers" size={13} />
            <span>Auto Layout</span>
          </button>

          <button
            type="button"
            className="dash-btn dash-btn-outline dash-btn-xs"
            onClick={handleValidate}
            title="Kiểm tra vòng lặp & dependency"
          >
            <I name="shield-check" size={13} />
            <span>Kiểm Tra DAG</span>
          </button>

          <button
            type="button"
            className="dash-btn dash-btn-outline dash-btn-xs"
            onClick={() => setShowJsonPreview(!showJsonPreview)}
            title="Xem mã JSON"
          >
            <I name="file-code" size={13} />
            <span>Preview JSON</span>
          </button>

          <button
            type="button"
            className="dash-btn dash-btn-primary dash-btn-xs"
            onClick={handleSave}
          >
            <I name="save" size={13} />
            <span>Lưu Workflow</span>
          </button>

          <button
            type="button"
            className="dash-btn dash-btn-emerald dash-btn-xs"
            onClick={handleRunWorkflow}
          >
            <I name="play" size={13} />
            <span>Kích Hoạt (Run)</span>
          </button>
        </div>
      </header>

      {/* =====================================
          3-COLUMN WORKSPACE
      ===================================== */}
      <div className="studio-workspace">
        {/* A. Left Sidebar: Node & Presets Palette */}
        <aside className="studio-sidebar">
          <div className="studio-sidebar-head">
            <div className="studio-tabs-toggle">
              <button
                type="button"
                className={`studio-tab-btn ${sidebarTab === "tasks" ? "active" : ""}`}
                onClick={() => setSidebarTab("tasks")}
              >
                <I name="cpu" size={13} />
                <span>Tác Vụ</span>
              </button>

              <button
                type="button"
                className={`studio-tab-btn ${sidebarTab === "presets" ? "active" : ""}`}
                onClick={() => setSidebarTab("presets")}
              >
                <I name="layers" size={13} />
                <span>Mẫu DAG</span>
              </button>
            </div>

            {sidebarTab === "tasks" ? (
              <div className="studio-search-wrap">
                <I name="search" size={13} />
                <input
                  type="text"
                  placeholder="Tìm tác vụ..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="studio-search-input"
                />
              </div>
            ) : (
              <p style={{ margin: 0, fontSize: "11px", color: "var(--dash-muted)" }}>
                Chọn mẫu để nạp nhanh đồ thị nhiều nhánh
              </p>
            )}
          </div>

          <div className="studio-node-list">
            {sidebarTab === "tasks" ? (
              NODE_TYPES.filter(
                (t) =>
                  t.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
                  t.desc.toLowerCase().includes(searchFilter.toLowerCase())
              ).map((t) => (
                <div
                  key={t.type}
                  className={`studio-node-pill pill-${t.color}`}
                  onClick={() => handleAddNode(t)}
                  title="Nhấp để thêm tác vụ này vào Canvas"
                >
                  <div className="studio-node-pill-top">
                    <span className={`studio-pill-icon ${t.color}`}>
                      <I name={t.icon} size={15} />
                    </span>
                    <strong className="studio-pill-name">{t.name}</strong>
                  </div>
                  <p className="studio-pill-desc">{t.desc}</p>
                  <div className="studio-pill-meta">
                    <span>Queue: <code>{t.queue}</code></span>
                    <span>Timeout: {t.defaultTimeout}s</span>
                  </div>
                </div>
              ))
            ) : (
              PRESET_TEMPLATES.map((p) => (
                <div
                  key={p.id}
                  className="studio-node-pill pill-purple"
                  onClick={() => handleLoadPreset(p)}
                  title="Nhấp để nạp mẫu này lên Canvas"
                >
                  <div className="studio-node-pill-top" style={{ justifyContent: "space-between" }}>
                    <strong className="studio-pill-name">{p.name}</strong>
                    <span
                      style={{
                        fontSize: "10px",
                        fontWeight: "750",
                        color: "#7c3aed",
                        background: "#f5f3ff",
                        padding: "2px 6px",
                        borderRadius: "5px",
                      }}
                    >
                      {p.badge}
                    </span>
                  </div>
                  <p className="studio-pill-desc">{p.desc}</p>
                  <div className="studio-pill-meta">
                    <span>Số bước: <strong>{p.steps.length}</strong></span>
                    <span style={{ color: "var(--dash-primary)", fontWeight: "750" }}>
                      Tải lên Canvas →
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="studio-sidebar-footer">
            <span className="studio-hint">
              <I name="info" size={13} style={{ flexShrink: 0, marginTop: "2px" }} />
              <span>
                <strong>Cách nối dây:</strong> Nhấp vào chấm tròn màu xanh (bên phải) của Node trước, rồi nhấp vào chấm tròn (bên trái) của Node sau.
              </span>
            </span>
          </div>
        </aside>

        {/* B. Center: Interactive Canvas */}
        <main
          className="studio-canvas-area"
          ref={canvasRef}
          onMouseDown={handleCanvasMouseDown}
        >
          {/* Canvas Controls Overlay */}
          <div className="studio-canvas-controls">
            <button
              type="button"
              className="dash-icon-btn xs"
              onClick={() => setZoom((z) => Math.min(1.8, z + 0.15))}
              title="Phóng to"
            >
              <I name="plus" size={13} />
            </button>
            <button
              type="button"
              className="dash-icon-btn xs"
              onClick={() => setZoom((z) => Math.max(0.5, z - 0.15))}
              title="Thu nhỏ"
            >
              <I name="minus" size={13} />
            </button>
            <button
              type="button"
              className="dash-icon-btn xs"
              onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
              title="Đặt lại góc nhìn"
            >
              <I name="rotate-ccw" size={13} />
            </button>
            <span className="studio-zoom-val">{Math.round(zoom * 100)}%</span>
          </div>

          {/* SVG Canvas for Grid & Edges */}
          <svg
            className="studio-svg-layer"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: "0 0",
            }}
          >
            <defs>
              <pattern id="studio-grid" width="24" height="24" patternUnits="userSpaceOnUse">
                <circle cx="2" cy="2" r="1" fill="#cbd5e1" opacity="0.6" />
              </pattern>
              <marker
                id="dag-arrow"
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 1 L 9 5 L 0 9 z" fill="#0891b2" />
              </marker>
            </defs>

            {/* Background grid */}
            <rect width="6000" height="4000" fill="url(#studio-grid)" />

            {/* Render Edges */}
            {edges.map((edge) => {
              const srcNode = nodes.find((n) => n.id === edge.from);
              const dstNode = nodes.find((n) => n.id === edge.to);
              if (!srcNode || !dstNode) return null;

              const x1 = srcNode.x + 205;
              const y1 = srcNode.y + 44;
              const x2 = dstNode.x;
              const y2 = dstNode.y + 44;
              const dx = Math.max(40, (x2 - x1) * 0.5);
              const pathD = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;

              return (
                <g key={edge.id} className="studio-edge-group">
                  <path
                    d={pathD}
                    className="studio-edge-path"
                    markerEnd="url(#dag-arrow)"
                  />
                  <path
                    d={pathD}
                    className="studio-edge-hit"
                    onClick={() => handleDeleteEdge(edge.id)}
                  >
                    <title>Nhấp để xóa liên kết phụ thuộc này</title>
                  </path>
                </g>
              );
            })}
          </svg>

          {/* Render Nodes as Interactive DOM Elements */}
          <div
            className="studio-nodes-layer"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: "0 0",
            }}
          >
            {nodes.map((node) => {
              const nodeMeta = NODE_TYPES.find((t) => t.type === node.type) || NODE_TYPES[1];
              const isSelected = selectedNodeId === node.id;
              const isConnecting = connectingFromId === node.id;

              return (
                <div
                  key={node.id}
                  className={`studio-node-card card-${nodeMeta.color} ${isSelected ? "selected" : ""} ${isConnecting ? "connecting-source" : ""}`}
                  style={{ transform: `translate(${node.x}px, ${node.y}px)` }}
                  onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                >
                  {/* Left Target Handle (Input) */}
                  <div
                    className="studio-handle handle-in"
                    onClick={(e) => handleHandleClick(e, node.id, false)}
                    title="Cổng vào: Nhấp để nhận dependency"
                  />

                  {/* Node Header */}
                  <div className="studio-node-card-head">
                    <div className="studio-node-badge">
                      <I name={nodeMeta.icon} size={13} />
                      <span>{node.type.replace("_TASK", "")}</span>
                    </div>
                    <button
                      type="button"
                      className="dash-icon-btn xs"
                      onClick={(e) => { e.stopPropagation(); handleDeleteNode(node.id); }}
                      title="Xóa node này"
                    >
                      <I name="x" size={11} />
                    </button>
                  </div>

                  {/* Node Body */}
                  <div className="studio-node-card-body">
                    <strong className="studio-node-name">{node.name}</strong>
                    <code className="studio-node-id">{node.id}</code>
                  </div>

                  {/* Node Footer */}
                  <div className="studio-node-card-foot">
                    <span className="studio-queue-pill">Q: {node.queue}</span>
                    <span className="studio-retry-pill">{node.maxRetries}x / {node.timeoutSeconds}s</span>
                  </div>

                  {/* Right Source Handle (Output) */}
                  <div
                    className={`studio-handle handle-out ${isConnecting ? "active" : ""}`}
                    onClick={(e) => handleHandleClick(e, node.id, true)}
                    title="Cổng ra: Nhấp để kéo kết nối tới node sau"
                  />
                </div>
              );
            })}
          </div>
        </main>

        {/* C. Right: Configuration Panel */}
        <aside className="studio-config-panel">
          {selectedNode ? (
            <div className="studio-config-body">
              <div className="studio-config-header">
                <div>
                  <h4 className="studio-config-title">Cấu Hình Tác Vụ</h4>
                  <span className="studio-config-sub">Chỉnh sửa thông số của node đang chọn</span>
                </div>
                <button
                  type="button"
                  className="dash-btn dash-btn-danger dash-btn-xs"
                  onClick={() => handleDeleteNode(selectedNode.id)}
                >
                  <I name="trash-2" size={12} /> Xóa
                </button>
              </div>

              <div className="studio-form-group">
                <label className="studio-form-label">Tên Bước (Step Name):</label>
                <input
                  type="text"
                  value={selectedNode.name}
                  onChange={(e) => {
                    const val = e.target.value;
                    setNodes((prev) => prev.map((n) => (n.id === selectedNode.id ? { ...n, name: val } : n)));
                  }}
                  className="studio-input"
                />
              </div>

              <div className="studio-form-group">
                <label className="studio-form-label">ID Bước (Unique Step ID):</label>
                <input
                  type="text"
                  value={selectedNode.id}
                  disabled
                  className="studio-input disabled"
                  title="ID được tạo duy nhất cho DAG"
                />
              </div>

              <div className="studio-form-group">
                <label className="studio-form-label">Loại Tác Vụ (Task Type):</label>
                <select
                  value={selectedNode.type}
                  onChange={(e) => {
                    const val = e.target.value;
                    setNodes((prev) => prev.map((n) => (n.id === selectedNode.id ? { ...n, type: val } : n)));
                  }}
                  className="studio-select"
                >
                  {NODE_TYPES.map((t) => (
                    <option key={t.type} value={t.type}>
                      {t.name} ({t.type})
                    </option>
                  ))}
                </select>
              </div>

              <div className="studio-form-group">
                <label className="studio-form-label">Hàng Đợi Worker (Queue):</label>
                <select
                  value={selectedNode.queue}
                  onChange={(e) => {
                    const val = e.target.value;
                    setNodes((prev) => prev.map((n) => (n.id === selectedNode.id ? { ...n, queue: val } : n)));
                  }}
                  className="studio-select"
                >
                  {SUPPORTED_QUEUES.map((q) => (
                    <option key={q} value={q}>
                      {q}
                    </option>
                  ))}
                </select>
              </div>

              <div className="studio-form-row">
                <div className="studio-form-group" style={{ flex: 1 }}>
                  <label className="studio-form-label">Max Retries:</label>
                  <input
                    type="number"
                    min={1}
                    max={5}
                    value={selectedNode.maxRetries}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10) || 1;
                      setNodes((prev) => prev.map((n) => (n.id === selectedNode.id ? { ...n, maxRetries: val } : n)));
                    }}
                    className="studio-input"
                  />
                </div>

                <div className="studio-form-group" style={{ flex: 1 }}>
                  <label className="studio-form-label">Timeout (giây):</label>
                  <input
                    type="number"
                    min={15}
                    max={600}
                    step={15}
                    value={selectedNode.timeoutSeconds}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10) || 30;
                      setNodes((prev) => prev.map((n) => (n.id === selectedNode.id ? { ...n, timeoutSeconds: val } : n)));
                    }}
                    className="studio-input"
                  />
                </div>
              </div>

              {/* Dependencies Checklist */}
              <div className="studio-form-group">
                <label className="studio-form-label">
                  Phụ thuộc bước nào (Depends On):
                </label>
                <div className="studio-deps-list">
                  {nodes
                    .filter((other) => other.id !== selectedNode.id)
                    .map((other) => {
                      const hasEdge = edges.some((e) => e.from === other.id && e.to === selectedNode.id);
                      return (
                        <label key={other.id} className="studio-dep-item">
                          <input
                            type="checkbox"
                            checked={hasEdge}
                            onChange={(e) => {
                              if (e.target.checked) {
                                const newEdges = [...edges, { id: `e-${other.id}-${selectedNode.id}`, from: other.id, to: selectedNode.id }];
                                const check = validateDagKahn(nodes, newEdges);
                                if (!check.valid) {
                                  toast(check.error, "danger");
                                  return;
                                }
                                setEdges(newEdges);
                              } else {
                                setEdges((prev) => prev.filter((edge) => !(edge.from === other.id && edge.to === selectedNode.id)));
                              }
                            }}
                          />
                          <span>{other.name} (<code>{other.id}</code>)</span>
                        </label>
                      );
                    })}
                  {nodes.length <= 1 && (
                    <span style={{ fontSize: "11px", color: "var(--dash-muted)" }}>
                      Không có node khác để làm dependency.
                    </span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="studio-config-empty">
              <I name="mouse-pointer" size={32} />
              <h4>Chưa chọn tác vụ nào</h4>
              <p>Nhấp vào bất kỳ Node nào trên Canvas để chỉnh sửa tên, loại task, queue và thời gian chờ.</p>
            </div>
          )}
        </aside>
      </div>

      {/* Modal: Preview JSON */}
      {showJsonPreview && (
        <div className="dash-modal-backdrop" onClick={() => setShowJsonPreview(false)}>
          <div className="dash-modal dash-modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="dash-modal-head">
              <div className="dash-modal-title-group">
                <div className="dash-modal-icon-badge blue">
                  <I name="file-code" size={18} />
                </div>
                <div>
                  <h3 className="dash-modal-title">FlowForge DAG JSON Definition</h3>
                  <span className="dash-modal-subtitle">
                    Biên dịch hai chiều tự động từ đồ thị Canvas sang Schema backend
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="dash-icon-btn"
                onClick={() => setShowJsonPreview(false)}
              >
                <I name="x" size={16} />
              </button>
            </div>
            <div className="dash-modal-body">
              <pre className="dash-code-block">{currentDagJson}</pre>
            </div>
            <div className="dash-modal-actions">
              <button
                type="button"
                className="dash-btn dash-btn-outline"
                onClick={() => setShowJsonPreview(false)}
              >
                Đóng
              </button>
              <button
                type="button"
                className="dash-btn dash-btn-primary"
                onClick={() => {
                  navigator.clipboard.writeText(currentDagJson);
                  toast("Đã copy JSON vào Clipboard!", "success");
                }}
              >
                <I name="copy" size={13} /> Copy JSON
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: AI Prompt-to-DAG */}
      {showAiModal && (
        <div className="dash-modal-backdrop" onClick={() => setShowAiModal(false)}>
          <div className="dash-modal" style={{ maxWidth: "620px" }} onClick={(e) => e.stopPropagation()}>
            <div className="dash-modal-head">
              <div className="dash-modal-title-group">
                <div className="dash-modal-icon-badge purple">
                  <I name="sparkles" size={18} />
                </div>
                <div>
                  <h3 className="dash-modal-title">AI Prompt-to-DAG Generator</h3>
                  <span className="dash-modal-subtitle">
                    9Router AI sẽ tự động phân rã nghiệp vụ và vẽ trực tiếp lên Canvas
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="dash-icon-btn"
                onClick={() => setShowAiModal(false)}
              >
                <I name="x" size={16} />
              </button>
            </div>
            <form onSubmit={handleAiGenerateToCanvas}>
              <div className="dash-modal-body">
                <label className="studio-form-label">Mô tả quy trình cần tạo:</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Ví dụ: Quy trình AI tự động thẩm định hồ sơ vay: OCR giấy tờ và tra cứu tín dụng song song, sau đó chấm điểm rủi ro và gửi thông báo..."
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  className="dash-textarea"
                />
              </div>
              <div className="dash-modal-actions">
                <button
                  type="button"
                  className="dash-btn dash-btn-outline"
                  onClick={() => setShowAiModal(false)}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="dash-btn dash-btn-ai"
                  disabled={aiLoading}
                >
                  <I name="sparkles" size={14} />
                  <span>{aiLoading ? "9Router đang thiết kế DAG..." : "Sinh & Đưa Lên Canvas"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
