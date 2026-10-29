import { useMemo, useState } from "react";
import { I } from "../lib/icons";
import { initials, roleUi } from "../lib/format";
import { ROLE_LABEL } from "../lib/auth";
import { useFinance } from "../lib/store";

export function RolePill({ role }) {
  return <span className="role-text">{roleUi(role)}</span>;
}

export default function UsersPage() {
  const { users } = useFinance();
  const [tab, setTab] = useState("all");
  const [q, setQ] = useState("");
  const [modal, setModal] = useState(null);

  const rows = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return users.filter((u) => {
      const active = u.status === "active";
      if (tab === "active" && !active) return false;
      if (tab === "disabled" && active) return false;
      if (qq && !`${u.name} ${u.email}`.toLowerCase().includes(qq)) return false;
      return true;
    });
  }, [users, tab, q]);

  const rec = modal?.id ? users.find((u) => u.id === modal.id) : null;

  return (
    <>
      <div className="toolbar" style={{ marginTop: 0 }}>
        <label className="search-box toolbar-search">
          <I name="search" />
          <input
            type="search"
            placeholder="Tìm theo tên hoặc email..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </label>
        <div className="seg-tabs">
          {[["all", "Tất cả"], ["active", "Hoạt động"], ["disabled", "Ngừng kích hoạt"]].map(([k, l]) => (
            <button key={k} className={`tab ${tab === k ? "on" : ""}`} type="button" onClick={() => setTab(k)}>
              {l}
            </button>
          ))}
        </div>
      </div>

      <article className="card" style={{ padding: 0 }}>
        <div className="table-wrap">
          <table className="users-table">
            <thead>
              <tr>
                <th>Người dùng</th>
                <th>Vai trò</th>
                <th>Trạng thái</th>
                <th>Hoạt động gần nhất</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((u) => (
                <tr key={u.id}>
                  <td>
                    <div className="user-cell">
                      <span className="avatar user-initials" aria-hidden="true">{initials(u.name)}</span>
                      <div className="meta">
                        <b>{u.name}</b>
                        <small>{u.email}</small>
                      </div>
                    </div>
                  </td>
                  <td><RolePill role={u.role} /></td>
                  <td>
                    {u.status === "active" ? (
                      <span className="badge ok"><I name="check-circle" size={12} /> Đang hoạt động</span>
                    ) : (
                      <span className="badge fail"><I name="circle-off" size={12} /> Ngừng kích hoạt</span>
                    )}
                  </td>
                  <td className="muted">{u.lastActive || "Vừa xong"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>

      <div className="role-cards" style={{ marginTop: "24px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px" }}>
        <article className="card">
          <h3>Administrator</h3>
          <p className="muted">Toàn quyền hệ thống. Quản lý phân quyền, cấu hình cluster và kiểm toán.</p>
        </article>
        <article className="card">
          <h3>Operations Lead</h3>
          <p className="muted">Quản trị vận hành. Kích hoạt workflow, hủy lượt chạy, giám sát Worker nodes.</p>
        </article>
        <article className="card">
          <h3>Workflow Developer</h3>
          <p className="muted">Tạo mới, định nghĩa DAG, cấu hình Task Queues và kích hoạt kiểm thử.</p>
        </article>
        <article className="card">
          <h3>Platform Observer</h3>
          <p className="muted">Chỉ đọc. Xem trạng thái tiến trình thực thi và biểu đồ metrics.</p>
        </article>
      </div>
    </>
  );
}
