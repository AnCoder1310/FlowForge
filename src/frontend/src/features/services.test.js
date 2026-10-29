import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { setAccessToken } from "../lib/api";
import { listAuditLogs } from "./audit/services/auditService";
import { getDashboard } from "./dashboard/services/dashboardService";

const json = (body, init = {}) =>
  new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" }, ...init });

let fetchMock;
beforeEach(() => {
  fetchMock = vi.fn(async () => json({ items: [], meta: {} }));
  vi.stubGlobal("fetch", fetchMock);
  setAccessToken("t");
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const url = () => fetchMock.mock.calls.at(-1)[0];

describe("auditService", () => {
  it("gửi trang mặc định khi không có bộ lọc", async () => {
    await listAuditLogs();
    expect(url()).toContain("/api/v1/audit");
  });
});

describe("dashboardService", () => {
  it("lấy metrics dashboard", async () => {
    fetchMock.mockResolvedValueOnce(json({ totalWorkflows: 5 }));
    await getDashboard();
    expect(url()).toContain("/api/v1/dashboard");
  });
});
