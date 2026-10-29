import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./audit/services/auditService", () => ({ listAuditLogs: vi.fn() }));
vi.mock("./dashboard/services/dashboardService", () => ({ getDashboard: vi.fn() }));

import { useAuditLogs } from "./audit/hooks/useAuditLogs";
import { listAuditLogs } from "./audit/services/auditService";

const page = (items, totalItems = items.length) => ({
  items,
  meta: { page: 1, pageSize: 20, totalItems, totalPages: Math.ceil(totalItems / 20) },
});

beforeEach(() => vi.clearAllMocks());

describe("useAuditLogs", () => {
  it("tải dữ liệu lần đầu", async () => {
    listAuditLogs.mockResolvedValue(page([{ id: 1 }], 41));
    const { result } = renderHook(() => useAuditLogs({}, 1));
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.items).toEqual([{ id: 1 }]);
    expect(result.current.meta.totalPages).toBe(3);
    expect(result.current.error).toBe("");
  });
});
