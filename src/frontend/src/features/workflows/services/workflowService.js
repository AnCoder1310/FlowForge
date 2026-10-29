import { api } from "../../../lib/api";

/**
 * Lấy danh sách định nghĩa DAG workflows.
 */
export async function listWorkflows() {
  return api.get("/workflows");
}

/**
 * Lấy chi tiết một workflow theo ID.
 */
export async function getWorkflow(id) {
  return api.get(`/workflows/${id}`);
}

/**
 * Tạo mới một workflow DAG.
 */
export async function createWorkflow(data) {
  return api.post("/workflows", data);
}

/**
 * Sinh workflow DAG tự động từ ngôn ngữ tự nhiên sử dụng AI.
 */
export async function generateWorkflowAi(prompt) {
  return api.post("/ai/generate-workflow", { prompt });
}
