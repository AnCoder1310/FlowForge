import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useOrchestrator } from "../../../lib/store";
import { I } from "../../../lib/icons";
import { api } from "../../../lib/api";

const NODE_TYPES = [
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

const SUPPORTED_QUEUES = [
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


const PRESET_TEMPLATES = [
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
      // Default starter template with parallel execution
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
      className="orch-studio-root"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {/* Studio Header Bar */}
      <header className="orch-studio-header">
        <div className="orch-studio-header-left">
          <button
            type="button"
            className="orch-btn orch-btn-ghost orch-btn-sm"
            onClick={onClose ? onClose : () => nav("/workflows")}
            title="Quay lại danh sách"
          >
            <I name="arrow-right" size={14} style={{ transform: "rotate(180deg)" }} />
            <span>Quay lại</span>
          </button>
          <div className="orch-studio-title-box">
            <input
              type="text"
              value={wfName}
              onChange={(e) => setWfName(e.target.value)}
              className="orch-studio-name-input"
              placeholder="Tên Workflow..."
            />
            <span className={`orch-tag ${validationResult?.valid ? "success" : validationResult?.valid === false ? "danger" : "neutral"}`}>
              {validationResult?.valid ? "DAG Hợp Lệ" : validationResult?.valid === false ? "Lỗi Chu Trình" : "Bản Thảo (Draft)"}
            </span>
          </div>
        </div>

        <div className="orch-studio-header-actions">
          <button
            type="button"
            className="orch-btn orch-btn-ai orch-btn-sm"
            onClick={() => setShowAiModal(true)}
          >
            <I name="sparkles" size={14} /> <span>AI Prompt-to-DAG</span>
          </button>
          <button
            type="button"
            className="orch-btn orch-btn-secondary orch-btn-sm"
            onClick={handleAutoLayout}
            title="Căn chỉnh các nhánh tự động"
          >
            <I name="layers" size={14} /> <span>Auto Layout</span>
          </button>
          <button
            type="button"
            className="orch-btn orch-btn-secondary orch-btn-sm"
            onClick={handleValidate}
            title="Kiểm tra vòng lặp & dependency"
          >
            <I name="shield-check" size={14} /> <span>Kiểm Tra DAG</span>
          </button>
          <button
            type="button"
            className="orch-btn orch-btn-secondary orch-btn-sm"
            onClick={() => setShowJsonPreview(!showJsonPreview)}
            title="Xem mã JSON"
          >
            <I name="file-code" size={14} /> <span>Preview JSON</span>
          </button>
          <button
            type="button"
            className="orch-btn orch-btn-primary orch-btn-sm"
            onClick={handleSave}
          >
            <I name="save" size={14} /> <span>Lưu Workflow</span>
          </button>
          <button
            type="button"
            className="orch-btn orch-btn-emerald orch-btn-sm"
            onClick={handleRunWorkflow}
            style={{ background: "var(--orch-accent-emerald, #10b981)", color: "#fff" }}
          >
            <I name="play" size={14} /> <span>Kích Hoạt (Run)</span>
          </button>
        </div>
      </header>

      {/* Main Studio Body: 3-Column Layout */}
      <div className="orch-studio-workspace">
        {/* A. Left Sidebar: Node Library */}
        <aside className="orch-studio-sidebar">
          <div className="orch-studio-sidebar-head">
            <div style={{ display: "flex", gap: "6px", marginBottom: "10px" }}>
              <button
                type="button"
                className={`orch-btn orch-btn-sm ${sidebarTab === "tasks" ? "orch-btn-primary" : "orch-btn-secondary"}`}
                style={{ flex: 1, padding: "5px 8px", fontSize: "0.75rem" }}
                onClick={() => setSidebarTab("tasks")}
              >
                <I name="cpu" size={13} /> Tác Vụ
              </button>
              <button
                type="button"
                className={`orch-btn orch-btn-sm ${sidebarTab === "presets" ? "orch-btn-primary" : "orch-btn-secondary"}`}
                style={{ flex: 1, padding: "5px 8px", fontSize: "0.75rem" }}
                onClick={() => setSidebarTab("presets")}
              >
                <I name="layers" size={13} /> Mẫu DAG
              </button>
            </div>
            {sidebarTab === "tasks" ? (
              <div className="orch-studio-search-wrap">
                <I name="search" size={13} />
                <input
                  type="text"
                  placeholder="Tìm tác vụ..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="orch-studio-search-input"
                />
              </div>
            ) : (
              <p className="orch-studio-sidebar-sub" style={{ margin: 0 }}>Chọn mẫu để nạp nhanh đồ thị nhiều nhánh</p>
            )}
          </div>

          <div className="orch-studio-node-list">
            {sidebarTab === "tasks" ? (
              NODE_TYPES.filter(
                (t) =>
                  t.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
                  t.desc.toLowerCase().includes(searchFilter.toLowerCase())
              ).map((t) => (
                <div
                  key={t.type}
                  className={`orch-studio-node-pill pill-${t.color}`}
                  onClick={() => handleAddNode(t)}
                  title="Nhấp để thêm tác vụ này vào Canvas"
                >
                  <div className="orch-studio-node-pill-top">
                    <span className={`orch-studio-pill-icon ${t.color}`}>
                      <I name={t.icon} size={15} />
                    </span>
                    <strong className="orch-studio-pill-name">{t.name}</strong>
                  </div>
                  <p className="orch-studio-pill-desc">{t.desc}</p>
                  <div className="orch-studio-pill-meta">
                    <span>Queue: <code>{t.queue}</code></span>
                    <span>Timeout: {t.defaultTimeout}s</span>
                  </div>
                </div>
              ))
            ) : (
              PRESET_TEMPLATES.map((p) => (
                <div
                  key={p.id}
                  className="orch-studio-node-pill pill-purple"
                  onClick={() => handleLoadPreset(p)}
                  title="Nhấp để nạp mẫu này lên Canvas"
                >
                  <div className="orch-studio-node-pill-top" style={{ justifyContent: "space-between" }}>
                    <strong className="orch-studio-pill-name">{p.name}</strong>
                    <span className="orch-tag purple" style={{ fontSize: "0.62rem", padding: "1px 5px" }}>{p.badge}</span>
                  </div>
                  <p className="orch-studio-pill-desc">{p.desc}</p>
                  <div className="orch-studio-pill-meta">
                    <span>Số bước: <strong>{p.steps.length}</strong></span>
                    <span style={{ color: "var(--primary)", fontWeight: 600 }}>Tải lên Canvas →</span>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="orch-studio-sidebar-footer">
            <span className="orch-studio-hint">
              <I name="info" size={12} /> <strong>Cách nối dây:</strong> Nhấp vào chấm tròn màu xanh (bên phải) của Node trước, rồi nhấp vào chấm tròn (bên trái) của Node sau.
            </span>
          </div>
        </aside>

        {/* B. Center: Interactive Canvas */}
        <main
          className="orch-studio-canvas-area"
          ref={canvasRef}
          onMouseDown={handleCanvasMouseDown}
        >
          {/* Canvas Controls overlay */}
          <div className="orch-studio-canvas-controls">
            <button
              type="button"
              className="orch-icon-btn sm"
              onClick={() => setZoom((z) => Math.min(1.8, z + 0.15))}
              title="Phóng to"
            >
              <I name="plus" size={14} />
            </button>
            <button
              type="button"
              className="orch-icon-btn sm"
              onClick={() => setZoom((z) => Math.max(0.5, z - 0.15))}
              title="Thu nhỏ"
            >
              <I name="minus" size={14} />
            </button>
            <button
              type="button"
              className="orch-icon-btn sm"
              onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
              title="Đặt lại góc nhìn"
            >
              <I name="rotate-ccw" size={14} />
            </button>
            <span className="orch-studio-zoom-val">{Math.round(zoom * 100)}%</span>
          </div>

          {/* SVG Canvas for Grid & Edges */}
          <svg
            className="orch-studio-svg-layer"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: "0 0",
            }}
          >
            <defs>
              <pattern id="studio-grid" width="24" height="24" patternUnits="userSpaceOnUse">
                <circle cx="2" cy="2" r="1" fill="var(--orch-grid-dot, rgba(148, 163, 184, 0.25))" />
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
                <path d="M 0 1 L 9 5 L 0 9 z" fill="var(--orch-accent-primary, #6366f1)" />
              </marker>
            </defs>

            {/* Background grid */}
            <rect width="6000" height="4000" fill="url(#studio-grid)" />

            {/* Render Edges */}
            {edges.map((edge) => {
              const srcNode = nodes.find((n) => n.id === edge.from);
              const dstNode = nodes.find((n) => n.id === edge.to);
              if (!srcNode || !dstNode) return null;

              // Node dimensions approx 200 x 85
              const x1 = srcNode.x + 200;
              const y1 = srcNode.y + 42;
              const x2 = dstNode.x;
              const y2 = dstNode.y + 42;
              const dx = Math.max(40, (x2 - x1) * 0.5);
              const pathD = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;

              return (
                <g key={edge.id} className="orch-studio-edge-group">
                  <path
                    d={pathD}
                    className="orch-studio-edge-path"
                    markerEnd="url(#dag-arrow)"
                  />
                  {/* Invisible wide path for easy clicking to delete edge */}
                  <path
                    d={pathD}
                    className="orch-studio-edge-hit"
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
            className="orch-studio-nodes-layer"
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
                  className={`orch-studio-node-card card-${nodeMeta.color} ${isSelected ? "selected" : ""} ${isConnecting ? "connecting-source" : ""}`}
                  style={{ transform: `translate(${node.x}px, ${node.y}px)` }}
                  onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                >
                  {/* Left Target Handle (Input) */}
                  <div
                    className="orch-studio-handle handle-in"
                    onClick={(e) => handleHandleClick(e, node.id, false)}
                    title="Cổng vào: Nhấp để nhận dependency"
                  />

                  {/* Node Header */}
                  <div className="orch-studio-node-card-head">
                    <div className="orch-studio-node-badge">
                      <I name={nodeMeta.icon} size={13} />
                      <span>{node.type.replace("_TASK", "")}</span>
                    </div>
                    <button
                      type="button"
                      className="orch-icon-btn xs"
                      onClick={(e) => { e.stopPropagation(); handleDeleteNode(node.id); }}
                      title="Xóa node này"
                    >
                      <I name="x" size={12} />
                    </button>
                  </div>

                  {/* Node Body */}
                  <div className="orch-studio-node-card-body">
                    <strong className="orch-studio-node-name">{node.name}</strong>
                    <code className="orch-studio-node-id">{node.id}</code>
                  </div>

                  {/* Node Footer */}
                  <div className="orch-studio-node-card-foot">
                    <span className="orch-queue-pill">Q: {node.queue}</span>
                    <span className="orch-retry-pill">{node.maxRetries}x / {node.timeoutSeconds}s</span>
                  </div>

                  {/* Right Source Handle (Output) */}
                  <div
                    className={`orch-studio-handle handle-out ${isConnecting ? "active" : ""}`}
                    onClick={(e) => handleHandleClick(e, node.id, true)}
                    title="Cổng ra: Nhấp để kéo kết nối tới node sau"
                  />
                </div>
              );
            })}
          </div>
        </main>

        {/* C. Right: Configuration Panel */}
        <aside className="orch-studio-config-panel">
          {selectedNode ? (
            <div className="orch-studio-config-body">
              <div className="orch-studio-config-header">
                <div>
                  <h4 className="orch-studio-config-title">Cấu Hình Tác Vụ</h4>
                  <span className="orch-studio-config-sub">Chỉnh sửa thông số của node đang chọn</span>
                </div>
                <button
                  type="button"
                  className="orch-btn orch-btn-danger orch-btn-xs"
                  onClick={() => handleDeleteNode(selectedNode.id)}
                >
                  <I name="trash-2" size={13} /> Xóa
                </button>
              </div>

              <div className="orch-form-group">
                <label className="orch-form-label">Tên Bước (Step Name):</label>
                <input
                  type="text"
                  value={selectedNode.name}
                  onChange={(e) => {
                    const val = e.target.value;
                    setNodes((prev) => prev.map((n) => (n.id === selectedNode.id ? { ...n, name: val } : n)));
                  }}
                  className="orch-input"
                />
              </div>

              <div className="orch-form-group">
                <label className="orch-form-label">ID Bước (Unique Step ID):</label>
                <input
                  type="text"
                  value={selectedNode.id}
                  disabled
                  className="orch-input disabled"
                  title="ID được tạo duy nhất cho DAG"
                />
              </div>

              <div className="orch-form-group">
                <label className="orch-form-label">Loại Tác Vụ (Task Type):</label>
                <select
                  value={selectedNode.type}
                  onChange={(e) => {
                    const val = e.target.value;
                    setNodes((prev) => prev.map((n) => (n.id === selectedNode.id ? { ...n, type: val } : n)));
                  }}
                  className="orch-select"
                >
                  {NODE_TYPES.map((t) => (
                    <option key={t.type} value={t.type}>
                      {t.name} ({t.type})
                    </option>
                  ))}
                </select>
              </div>

              <div className="orch-form-group">
                <label className="orch-form-label">Hàng Đợi Worker (Queue):</label>
                <select
                  value={selectedNode.queue}
                  onChange={(e) => {
                    const val = e.target.value;
                    setNodes((prev) => prev.map((n) => (n.id === selectedNode.id ? { ...n, queue: val } : n)));
                  }}
                  className="orch-select"
                >
                  {SUPPORTED_QUEUES.map((q) => (
                    <option key={q} value={q}>
                      {q}
                    </option>
                  ))}
                </select>
              </div>

              <div className="orch-form-row">
                <div className="orch-form-group" style={{ flex: 1 }}>
                  <label className="orch-form-label">Max Retries:</label>
                  <input
                    type="number"
                    min={1}
                    max={5}
                    value={selectedNode.maxRetries}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10) || 1;
                      setNodes((prev) => prev.map((n) => (n.id === selectedNode.id ? { ...n, maxRetries: val } : n)));
                    }}
                    className="orch-input"
                  />
                </div>
                <div className="orch-form-group" style={{ flex: 1 }}>
                  <label className="orch-form-label">Timeout (giây):</label>
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
                    className="orch-input"
                  />
                </div>
              </div>

              {/* Dependencies Checklist */}
              <div className="orch-form-group" style={{ marginTop: "14px" }}>
                <label className="orch-form-label">
                  Phụ thuộc bước nào (Depends On):
                </label>
                <div className="orch-deps-checkbox-list">
                  {nodes
                    .filter((other) => other.id !== selectedNode.id)
                    .map((other) => {
                      const hasEdge = edges.some((e) => e.from === other.id && e.to === selectedNode.id);
                      return (
                        <label key={other.id} className="orch-dep-checkbox-item">
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
                  {nodes.length <= 1 && <span className="orch-form-hint">Không có node khác để làm dependency.</span>}
                </div>
              </div>
            </div>
          ) : (
            <div className="orch-studio-config-empty">
              <I name="mouse-pointer" size={32} />
              <h4>Chưa chọn tác vụ nào</h4>
              <p>Nhấp vào bất kỳ Node nào trên Canvas để chỉnh sửa tên, loại task, queue và thời gian chờ.</p>
            </div>
          )}
        </aside>
      </div>

      {/* Modal: Preview JSON */}
      {showJsonPreview && (
        <div className="orch-modal-backdrop" onClick={() => setShowJsonPreview(false)}>
          <div className="orch-modal orch-modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="orch-modal-head">
              <div className="orch-modal-title-group">
                <div className="orch-modal-icon-badge blue"><I name="file-code" size={18} /></div>
                <div>
                  <h3 className="orch-modal-title">FlowForge DAG JSON Definition</h3>
                  <span className="orch-modal-subtitle">Biên dịch hai chiều tự động từ đồ thị Canvas sang Schema backend</span>
                </div>
              </div>
              <button className="orch-icon-btn" onClick={() => setShowJsonPreview(false)}><I name="x" size={18} /></button>
            </div>
            <div className="orch-modal-body">
              <pre className="orch-code-block" style={{ maxHeight: "400px" }}>{currentDagJson}</pre>
            </div>
            <div className="orch-modal-actions">
              <button type="button" className="orch-btn orch-btn-secondary" onClick={() => setShowJsonPreview(false)}>Đóng</button>
              <button
                type="button"
                className="orch-btn orch-btn-primary"
                onClick={() => {
                  navigator.clipboard.writeText(currentDagJson);
                  toast("Đã copy JSON vào Clipboard!", "success");
                }}
              >
                <I name="clipboard" size={14} /> Copy JSON
              </button>
            </div>
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
                  <span className="orch-modal-subtitle">9Router AI sẽ tự động phân rã nghiệp vụ và vẽ trực tiếp lên Canvas</span>
                </div>
              </div>
              <button className="orch-icon-btn" onClick={() => setShowAiModal(false)}><I name="x" size={18} /></button>
            </div>
            <form onSubmit={handleAiGenerateToCanvas} className="orch-modal-body">
              <label className="orch-form-label">Mô tả quy trình cần tạo:</label>
              <textarea
                rows={4}
                required
                placeholder="Ví dụ: Quy trình AI tự động thẩm định hồ sơ vay: OCR giấy tờ và tra cứu tín dụng song song, sau đó chấm điểm rủi ro và gửi thông báo..."
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                className="orch-textarea"
              />
              <div className="orch-modal-actions" style={{ marginTop: "16px" }}>
                <button type="button" className="orch-btn orch-btn-secondary" onClick={() => setShowAiModal(false)}>Hủy</button>
                <button type="submit" className="orch-btn orch-btn-ai" disabled={aiLoading}>
                  <I name="sparkles" size={15} />
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
