import { api } from "../../../lib/api";

/**
 * GET /audit-logs
 * @param {{page?: number, pageSize?: number, action?: string, module?: string,
 *          actorUserId?: number, dateFrom?: string, dateTo?: string}} filters
 * @returns {Promise<{items: Array<{id: number, action: string, module: string, detail: string,
 *          actorUserId: number, changedAt: string}>,
 *          meta: {page: number, pageSize: number, totalItems: number, totalPages: number}}>}
 */
export function listAuditLogs({ page = 1, pageSize = 20, ...filters } = {}) {
  const qs = new URLSearchParams({ page, pageSize });
  Object.entries(filters).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") qs.set(k, v);
  });
  return api(`/audit-logs?${qs}`);
}
