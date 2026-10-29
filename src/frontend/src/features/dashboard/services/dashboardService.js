import { api } from "../../../lib/api";

/**
 * GET /dashboard
 * @returns {Promise<{currencyCode: string, totalIncome: number, totalExpense: number,
 *          netResult: number, transactionCount: number}>}
 */
export function getDashboard({ dateFrom, dateTo } = {}) {
  const p = new URLSearchParams();
  if (dateFrom) p.set("dateFrom", dateFrom);
  if (dateTo) p.set("dateTo", dateTo);
  const s = p.toString();
  return api(`/dashboard${s ? `?${s}` : ""}`);
}
