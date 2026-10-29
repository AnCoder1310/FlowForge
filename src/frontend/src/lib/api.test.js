import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, api, apiBlob, fetchAllPages, setAccessToken, setUnauthorizedHandler } from "./api";

const json = (body, init = {}) =>
  new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" }, ...init });

let fetchMock;
beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  setAccessToken(null);
  setUnauthorizedHandler(null);
});
afterEach(() => vi.unstubAllGlobals());

const lastCall = () => fetchMock.mock.calls.at(-1);

describe("api()", () => {
  it("gọi /api/v1 và trả về JSON", async () => {
    fetchMock.mockResolvedValue(json({ ok: 1 }));
    await expect(api("/dashboard")).resolves.toEqual({ ok: 1 });
    expect(lastCall()[0]).toBe("/api/v1/dashboard");
    expect(lastCall()[1].method).toBe("GET");
  });

  it("gắn Bearer token khi đã đăng nhập, và bỏ khi đăng xuất", async () => {
    fetchMock.mockResolvedValue(json({}));
    setAccessToken("abc");
    await api("/x");
    expect(lastCall()[1].headers.Authorization).toBe("Bearer abc");
    setAccessToken(null);
    await api("/x");
    expect(lastCall()[1].headers.Authorization).toBeUndefined();
  });

  it("gửi object dưới dạng JSON kèm Content-Type", async () => {
    fetchMock.mockResolvedValue(json({}));
    await api("/incomes", { method: "POST", body: { a: 1 } });
    const [, init] = lastCall();
    expect(init.headers["Content-Type"]).toBe("application/json");
    expect(init.body).toBe('{"a":1}');
  });

  it("gửi FormData nguyên vẹn và không tự đặt Content-Type", async () => {
    fetchMock.mockResolvedValue(json({}));
    const fd = new FormData();
    fd.append("importType", "INCOME");
    await api("/imports", { method: "POST", body: fd });
    const [, init] = lastCall();
    expect(init.body).toBe(fd);
    expect(init.headers["Content-Type"]).toBeUndefined();
  });

  it("trả null khi 204", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    await expect(api("/incomes/1", { method: "DELETE" })).resolves.toBeNull();
  });

  it("báo lỗi mạng bằng ApiError(status 0, NETWORK)", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
    const err = await api("/x").catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect([err.status, err.code]).toEqual([0, "NETWORK"]);
  });

  it.each([
    [{ errors: { amount: ["Sai số tiền."], date: ["Sai ngày."] } }, "Sai số tiền. Sai ngày."],
    [{ detail: "Chi tiết lỗi", title: "Tiêu đề" }, "Chi tiết lỗi"],
    [{ title: "Chỉ có tiêu đề" }, "Chỉ có tiêu đề"],
    [null, "Lỗi 400"],
  ])("lấy thông điệp lỗi từ phản hồi %j", async (body, message) => {
    fetchMock.mockResolvedValue(
      body ? json(body, { status: 400 }) : new Response("not json", { status: 400 }),
    );
    const err = await api("/x").catch((e) => e);
    expect(err.status).toBe(400);
    expect(err.message).toBe(message);
  });

  it("giữ mã lỗi nghiệp vụ", async () => {
    fetchMock.mockResolvedValue(json({ detail: "x", errorCode: "VALIDATION_ERROR" }, { status: 400 }));
    expect((await api("/x").catch((e) => e)).code).toBe("VALIDATION_ERROR");
  });

  it("gọi handler hết phiên khi 401 và đang có token", async () => {
    const onUnauthorized = vi.fn();
    setUnauthorizedHandler(onUnauthorized);
    setAccessToken("abc");
    fetchMock.mockResolvedValue(json({ title: "no" }, { status: 401 }));
    await api("/x").catch(() => {});
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  
  it("hỗ trợ các phương thức helper api.get, api.post, api.put, api.delete", async () => {
    fetchMock.mockResolvedValue(json({ success: true }));
    
    await api.get("/workflows");
    expect(lastCall()[0]).toBe("/api/v1/workflows");
    expect(lastCall()[1].method).toBe("GET");

    await api.post("/ai/generate-workflow", { prompt: "test" });
    expect(lastCall()[0]).toBe("/api/v1/ai/generate-workflow");
    expect(lastCall()[1].method).toBe("POST");
    expect(lastCall()[1].body).toBe(JSON.stringify({ prompt: "test" }));

    await api.put("/items/1", { name: "updated" });
    expect(lastCall()[1].method).toBe("PUT");

    await api.delete("/items/1");
    expect(lastCall()[1].method).toBe("DELETE");
  });

  it("không gọi handler khi 401 lúc chưa đăng nhập (sai mật khẩu)", async () => {
    const onUnauthorized = vi.fn();
    setUnauthorizedHandler(onUnauthorized);
    fetchMock.mockResolvedValue(json({ title: "no" }, { status: 401 }));
    await api("/auth/login", { method: "POST", body: {} }).catch(() => {});
    expect(onUnauthorized).not.toHaveBeenCalled();
  });
});

describe("apiBlob()", () => {
  it("trả blob và tên tệp lấy từ Content-Disposition", async () => {
    fetchMock.mockResolvedValue(
      new Response("data", {
        headers: { "Content-Disposition": "attachment; filename=financial-report.xlsx; filename*=UTF-8''financial-report.xlsx" },
      }),
    );
    const { blob, filename } = await apiBlob("/reports/export?format=XLSX");
    expect(filename).toBe("financial-report.xlsx");
    expect(await blob.text()).toBe("data");
  });

  it("filename là null khi thiếu header", async () => {
    fetchMock.mockResolvedValue(new Response("x"));
    expect((await apiBlob("/x")).filename).toBeNull();
  });

  it("ném ApiError khi lỗi", async () => {
    fetchMock.mockResolvedValue(json({ detail: "format must be PDF or XLSX." }, { status: 400 }));
    await expect(apiBlob("/x")).rejects.toThrow("format must be PDF or XLSX.");
  });
});

describe("fetchAllPages()", () => {
  it("gộp mọi trang và dừng ở trang cuối", async () => {
    fetchMock
      .mockResolvedValueOnce(json({ items: [1, 2], totalPages: 2 }))
      .mockResolvedValueOnce(json({ items: [3], totalPages: 2 }));
    await expect(fetchAllPages("/incomes")).resolves.toEqual([1, 2, 3]);
    expect(fetchMock.mock.calls.map((c) => c[0])).toEqual([
      "/api/v1/incomes?page=1&pageSize=100",
      "/api/v1/incomes?page=2&pageSize=100",
    ]);
  });

  it("dùng & khi đường dẫn đã có query", async () => {
    fetchMock.mockResolvedValue(json({ items: [], totalPages: 0 }));
    await fetchAllPages("/incomes?search=a");
    expect(lastCall()[0]).toBe("/api/v1/incomes?search=a&page=1&pageSize=100");
  });
});
