import { api } from "../../../lib/api";

/**
 * Lấy danh sách Worker nodes trong cụm phân tán.
 */
export async function listWorkers() {
  return api.get("/workers");
}

/**
 * Lấy telemetry và chỉ số cụm.
 */
export async function getClusterMetrics() {
  return api.get("/metrics/dashboard");
}
