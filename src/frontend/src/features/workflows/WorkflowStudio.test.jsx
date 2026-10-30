import { describe, it, expect } from "vitest";
import {
  validateDagKahn,
  dagToCanvas,
  canvasToDag,
} from "./components/WorkflowStudio";

describe("WorkflowStudio - DAG Kahn Algorithm & Serialization", () => {
  it("xác nhận DAG tuyến tính hợp lệ", () => {
    const nodes = [
      { id: "step-1", name: "Task 1", type: "HTTP_TASK", queue: "default" },
      { id: "step-2", name: "Task 2", type: "WORKER_TASK", queue: "compute" },
      { id: "step-3", name: "Task 3", type: "NOTIFICATION", queue: "notification" },
    ];
    const edges = [
      { id: "e1", from: "step-1", to: "step-2" },
      { id: "e2", from: "step-2", to: "step-3" },
    ];

    const result = validateDagKahn(nodes, edges);
    expect(result.valid).toBe(true);
  });

  it("xác nhận DAG có nhánh song song và hội tụ (fan-in join) hợp lệ", () => {
    const nodes = [
      { id: "root", name: "Root Ingest" },
      { id: "branch-a", name: "Branch A" },
      { id: "branch-b", name: "Branch B" },
      { id: "join", name: "Join Output" },
    ];
    const edges = [
      { id: "e1", from: "root", to: "branch-a" },
      { id: "e2", from: "root", to: "branch-b" },
      { id: "e3", from: "branch-a", to: "join" },
      { id: "e4", from: "branch-b", to: "join" },
    ];

    const result = validateDagKahn(nodes, edges);
    expect(result.valid).toBe(true);
  });

  it("phát hiện chu trình lặp kín (Cycle) và trả về lỗi", () => {
    const nodes = [
      { id: "task-1", name: "Task 1" },
      { id: "task-2", name: "Task 2" },
      { id: "task-3", name: "Task 3" },
    ];
    // Chu trình: 1 -> 2 -> 3 -> 1
    const edges = [
      { id: "e1", from: "task-1", to: "task-2" },
      { id: "e2", from: "task-2", to: "task-3" },
      { id: "e3", from: "task-3", to: "task-1" },
    ];

    const result = validateDagKahn(nodes, edges);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("chu trình");
  });

  it("ngăn chặn self-dependency (tự phụ thuộc vào chính mình)", () => {
    const nodes = [{ id: "task-1", name: "Task 1" }];
    const edges = [{ id: "e1", from: "task-1", to: "task-1" }];

    const result = validateDagKahn(nodes, edges);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("không thể tự phụ thuộc");
  });

  it("chuyển đổi 2 chiều: dagToCanvas và canvasToDag", () => {
    const backendSteps = [
      {
        id: "step-fetch",
        name: "Fetch Data",
        type: "HTTP_TASK",
        queue: "default",
        dependsOn: [],
        maxRetries: 2,
        timeoutSeconds: 30,
      },
      {
        id: "step-ai",
        name: "AI Sentiment",
        type: "AI_AGENT_TASK",
        queue: "ai-agent",
        dependsOn: ["step-fetch"],
        maxRetries: 2,
        timeoutSeconds: 60,
      },
      {
        id: "step-store",
        name: "Store Result",
        type: "WORKER_TASK",
        queue: "data-io",
        dependsOn: ["step-ai"],
        maxRetries: 3,
        timeoutSeconds: 120,
      },
    ];

    // dagToCanvas
    const { nodes, edges } = dagToCanvas(backendSteps);
    expect(nodes.length).toBe(3);
    expect(edges.length).toBe(2);
    expect(nodes[0].x).toBeLessThan(nodes[1].x);
    expect(nodes[1].x).toBeLessThan(nodes[2].x);

    // canvasToDag
    const dag = canvasToDag(nodes, edges);
    expect(dag.steps.length).toBe(3);
    expect(dag.steps[0].dependsOn).toEqual([]);
    expect(dag.steps[1].dependsOn).toEqual(["step-fetch"]);
    expect(dag.steps[2].dependsOn).toEqual(["step-ai"]);
    expect(dag.steps[1].type).toBe("AI_AGENT_TASK");
    expect(dag.steps[1].queue).toBe("ai-agent");
  });
});
