import { api } from "../../../lib/api";

/**
 * Lấy lịch sử các lượt chạy (Executions).
 */
export async function listExecutions() {
  return api.get("/executions");
}

/**
 * Lấy chi tiết một lượt chạy theo ID.
 */
export async function getExecution(id) {
  return api.get(`/executions/${id}`);
}

/**
 * Kích hoạt một workflow run mới.
 */
export async function triggerWorkflowRun(workflowId, inputPayloadJson = "{}") {
  return api.post(`/executions/workflows/${workflowId}/trigger`, { inputPayloadJson });
}

/**
 * Hủy bỏ một lượt chạy đang diễn ra.
 */
export async function cancelExecutionRun(id) {
  return api.post(`/executions/${id}/cancel`);
}

/**
 * AI chẩn đoán nguyên nhân lỗi lượt chạy và đề xuất hành động tự phục hồi.
 */
export async function diagnoseFailureAi(instanceId, taskId = null) {
  return api.post("/ai/diagnose-failure", { instanceId, taskId });
}
