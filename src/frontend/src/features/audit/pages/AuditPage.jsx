import { useMemo, useState } from "react";
import { I } from "../../../lib/icons";
import { initials, roleUi } from "../../../lib/format";
import { useFinance } from "../../../lib/store";
import { Kpi } from "../../dashboard/pages/Dashboard";
import { useAuditLogs } from "../hooks/useAuditLogs";

const ACT = {
  LOGIN: ["neutral", "Đăng nhập"],
  INSERT: ["ok", "Tạo mới"],
  CREATE: ["ok", "Tạo mới"],
  LOGOUT: ["neutral", "Đăng xuất"],
  UPDATE: ["info", "Cập nhật"],
  IMPORT: ["warn", "Nhập file"],
  DELETE: ["fail", "Xóa"],
  EXPORT: ["ok", "Xuất file"],
};

const PAGE_SIZE = 20;

function fmtTime(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const p = (n) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}\n${p(d.getHours())}:${p(d.getMinutes())}`;
}

export default function AuditPage() {
  const { users, userName, current } = useFinance();
  const [q, setQ] = useState("");
  const [action, setAction] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);

  const { items, meta, loading, error, refresh } = useAuditLogs({ action, dateFrom, dateTo }, page, PAGE_SIZE);

  const setFilter = (setter) => (e) => {
    setter(e.target.value);
    setPage(1);
  };

  const rows = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return items
      .map((a) => {
        const user = a.actorName || userName(a.actorUserId);
        return {
          id: "LOG-" + String(a.id).padStart(3, "0"),
          user: user === "—" ? `Người dùng #${a.actorUserId}` : user,
          role: a.actorUserId === current?.id
            ? roleUi(current.role)
            : roleUi(users.find((u) => u.id === a.actorUserId)?.role),
          action: String(a.action).toUpperCase(),
          module: a.module,
          detail: a.detail,
          time: fmtTime(a.changedAt),
        };
      })
      .filter((a) => !qq || `${a.action}${a.detail}${a.user}${a.module}`.toLowerCase().includes(qq));
  }, [items, q, users, userName, current]);

  const kpis = [
    { label: "Tổng số log", value: String(meta.totalItems) },
    { label: "Log ở trang này", value: String(items.length) },
    { label: "Người thực hiện (trang này)", value: String(new Set(items.map((a) => a.actorUserId)).size) },
  ];

  return (
    <>
      <div className="kpis">{kpis.map((k) => <Kpi key={k.label} {...k} />)}</div>
      <div className="toolbar">
        <label className="search-box toolbar-search">
          <I name="search" />
          <input type="search" placeholder="Tìm trong trang hiện tại..." value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        <select aria-label="Hành động" value={action} onChange={setFilter(setAction)}>
          <option value="">Tất cả hành động</option>
          {Object.entries(ACT).map(([k, v]) => <option key={k} value={k}>{v[1]}</option>)}
        </select>
        <input type="date" aria-label="Từ ngày" value={dateFrom} max={dateTo || undefined} onChange={setFilter(setDateFrom)} />
        <input type="date" aria-label="Đến ngày" value={dateTo} min={dateFrom || undefined} onChange={setFilter(setDateTo)} />
        <div className="toolbar-action-btns">
          <button className="btn primary" type="button" onClick={refresh} disabled={loading}>
            <I name="refresh-cw" /> Làm mới
          </button>
        </div>
      </div>
      {error ? <div className="alert-error" style={{ marginBottom: 12 }}>{error}</div> : null}
      <article className="card" style={{ padding: 0 }}>
        <div className="table-wrap">
          <table className="audit-table">
            <thead><tr><th>ID</th><th>Người thực hiện</th><th>Hành động</th><th>Phân mục</th><th>Mô tả chi tiết</th><th>Thời gian</th></tr></thead>
            <tbody>
              {loading && rows.length === 0 ? <tr><td colSpan={6}><div className="empty">Đang tải...</div></td></tr> : null}
              {!loading && rows.length === 0 ? <tr><td colSpan={6}><div className="empty">Không có nhật ký phù hợp.</div></td></tr> : null}
              {rows.map((a) => {
                const m = ACT[a.action] || ["info", a.action];
                return (
                  <tr key={a.id}>
                    <td><span className="cell-code">{a.id}</span></td>
                    <td><div className="user-cell"><span className="avatar audit-avatar">{initials(a.user)}</span><div className="meta"><b>{a.user}</b><small>{a.role || ""}</small></div></div></td>
                    <td><span className={`audit-action ${m[0]}`}>{m[1]}</span></td>
                    <td>{a.module}</td>
                    <td>{a.detail}</td>
                    <td><span className="audit-time">{a.time}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {meta.totalPages > 1 ? (
          <div className="toolbar" style={{ justifyContent: "space-between", padding: "12px 16px" }}>
            <span className="muted">Trang {meta.page} / {meta.totalPages}</span>
            <div className="toolbar-action-btns">
              <button className="btn ghost sm" type="button" disabled={loading || page <= 1} onClick={() => setPage((p) => p - 1)}>Trước</button>
              <button className="btn ghost sm" type="button" disabled={loading || page >= meta.totalPages} onClick={() => setPage((p) => p + 1)}>Sau</button>
            </div>
          </div>
        ) : null}
      </article>
    </>
  );
}
