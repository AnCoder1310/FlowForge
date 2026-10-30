import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { I } from "../lib/icons";
import { roleUi } from "../lib/format";
import { useOrchestrator } from "../lib/store";
import { RolePill } from "./UsersPage";

export function Forbidden() {
  const nav = useNavigate();
  return (
    <div style={{ textAlign: "center", padding: "60px 20px" }}>
      <I name="shield-alert" size={48} />
      <h2 style={{ marginTop: 16 }}>403 - Không có quyền truy cập</h2>
      <p style={{ color: "#64748b" }}>Bạn không có quyền hạn cần thiết để thao tác tính năng này.</p>
      <button className="btn primary" onClick={() => nav("/dashboard")} style={{ marginTop: 16 }}>
        Về Trang Tổng Quan
      </button>
    </div>
  );
}

export default function ProfilePage() {
  const { current, toast } = useOrchestrator();
  const nav = useNavigate();
  const [tab, setTab] = useState("account");
  const displayName = current?.name || "User";
  const displayEmail = current?.email || "";
  const uid = `#${(current?.role === "ADMIN" ? "ADM" : current?.role === "OPERATOR" ? "OPR" : current?.role === "DEVELOPER" ? "DEV" : "OBS")}-${String(current?.id || 1).padStart(3, "0")}`;

  const permRows = [
    ["dashboard", "Tổng quan Orchestrator"],
    ["workflowRead", "Xem định nghĩa DAG"],
    ["workflowWrite", "Tạo & Cập nhật DAG"],
    ["executionRead", "Xem tiến trình thực thi (Runs)"],
    ["executionTrigger", "Kích hoạt Workflow Run"],
    ["executionCancel", "Hủy bỏ lượt chạy"],
    ["workerRead", "Xem Worker Nodes & Task Queues"],
    ["auditRead", "Xem nhật ký kiểm toán"],
    ["userManagement", "Quản lý người dùng hệ thống"],
  ];

  return (
    <>
      <div className="profile-tabs-bar">
        <div className="seg-tabs-items">
          {[["account", "Tài khoản"], ["security", "Bảo mật"], ["roles", "Vai trò & Quyền hạn"]].map(([k, l]) => (
            <button key={k} type="button" className={`tab ${tab === k ? "on" : ""}`} onClick={() => setTab(k)}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {tab === "account" && (
        <div className="profile-grid">
          <article className="card profile-side">
            <div className="avatar-wrap">
              <span className="avatar lg">{displayName.slice(0, 2).toUpperCase()}</span>
            </div>
            <h3>{displayName}</h3>
            <p className="muted">{roleUi(current?.role)}</p>
            <p className="profile-badges">
              <span className="badge ok">Hoạt động</span>
              <span className="badge info">ID: {uid}</span>
            </p>
          </article>
          <article className="card profile-detail">
            <h3 className="section-title">Chi tiết tài khoản</h3>
            <div className="form-grid">
              <label className="field"><span className="lab"><I name="user" /> Họ và tên</span><input defaultValue={displayName} disabled /></label>
              <label className="field"><span className="lab"><I name="mail" /> Địa chỉ Email</span><input defaultValue={displayEmail} disabled /></label>
              <label className="field"><span className="lab"><I name="briefcase" /> Vai trò</span><input defaultValue={roleUi(current?.role)} disabled /></label>
            </div>
          </article>
        </div>
      )}

      {tab === "security" && (
        <article className="card">
          <h3 className="section-title">Đổi mật khẩu</h3>
          <form onSubmit={(e) => { e.preventDefault(); toast("Mật khẩu đã được cập nhật thành công!", "success"); }}>
            <div className="form-grid">
              <label className="field span-2"><span>Mật khẩu hiện tại</span><input type="password" required placeholder="••••••••" /></label>
              <label className="field"><span>Mật khẩu mới</span><input type="password" required minLength={6} /></label>
              <label className="field"><span>Xác nhận mật khẩu mới</span><input type="password" required minLength={6} /></label>
            </div>
            <div style={{ marginTop: 16 }}>
              <button className="btn primary" type="submit"><I name="save" /> Lưu mật khẩu</button>
            </div>
          </form>
        </article>
      )}

      {tab === "roles" && (
        <div className="profile-stack">
          <article className="card">
            <h3 className="section-title">Vai trò hiện tại</h3>
            <div className="current-role"><RolePill role={current?.role} /></div>
          </article>
          <article className="card" style={{ padding: 0 }}>
            <div className="card-head" style={{ padding: "16px 16px 8px" }}><h3 className="section-title">Ma trận quyền hạn</h3></div>
            <div className="table-wrap">
              <table className="perm-table">
                <thead><tr><th>Chức năng</th><th>Quyền của bạn</th></tr></thead>
                <tbody>
                  {permRows.map(([k, l]) => (
                    <tr key={k}>
                      <td>{l}</td>
                      <td><span className="badge ok"><I name="check" size={13} /> Cho phép</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
        </div>
      )}
    </>
  );
}
