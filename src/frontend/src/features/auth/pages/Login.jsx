import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { I } from "../../../lib/icons";
import { useOrchestrator } from "../../../lib/store";
import { BrandIcon } from "../../../components/BrandLogo";

const DEMO_ACCOUNTS = [
  { role: "ADMIN", name: "Admin", email: "admin@orchestrator.local", sub: "Quản trị cụm" },
  { role: "OPERATOR", name: "Operator", email: "operator@orchestrator.local", sub: "Vận hành DAG" },
  { role: "DEVELOPER", name: "Developer", email: "dev@orchestrator.local", sub: "Tạo Workflow" },
  { role: "VIEWER", name: "Observer", email: "viewer@orchestrator.local", sub: "Chỉ theo dõi" },
];

export default function Login() {
  const { login, toast } = useOrchestrator();
  const nav = useNavigate();
  const [email, setEmail] = useState("admin@orchestrator.local");
  const [password, setPassword] = useState("ChangeMe123!");
  const [remember, setRemember] = useState(true);
  const [err, setErr] = useState("");
  const [show, setShow] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    setSubmitting(true);

    try {
      await login(email.trim(), password, remember);
      nav("/dashboard");
    } catch (error) {
      setErr(error.message || "Đăng nhập thất bại");
    } finally {
      setSubmitting(false);
    }
  }

  function selectDemo(acc) {
    setEmail(acc.email);
    setPassword("ChangeMe123!");
    setErr("");
    toast(`Đã chọn tài khoản: ${acc.name}`);
  }

  return (
    <div className="login-split">
      <section className="login-panel">
        <div className="login-box">
          <div className="login-head">
            <div className="login-brand-lead">
              <BrandIcon size={44} />
              <div>
                <h1 className="login-title">Orchestrator Console</h1>
                <p className="login-sub">Distributed Workflow Orchestration Engine</p>
              </div>
            </div>
          </div>

          <form onSubmit={onSubmit} className="login-form">
            {err && (
              <div className="login-err-banner">
                <I name="circle-alert" size={16} />
                <span>{err}</span>
              </div>
            )}

            <div className="form-group">
              <label htmlFor="login-email">Tài khoản Email</label>
              <div className="input-icon-wrap">
                <I name="mail" size={16} />
                <input
                  id="login-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@orchestrator.local"
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="login-password">Mật khẩu</label>
              <div className="input-icon-wrap">
                <I name="lock" size={16} />
                <input
                  id="login-password"
                  type={show ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Nhập mật khẩu..."
                />
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => setShow((v) => !v)}
                  style={{ position: "absolute", right: "8px" }}
                >
                  <I name={show ? "eye-off" : "eye"} size={16} />
                </button>
              </div>
            </div>

            <button type="submit" className="btn primary" disabled={submitting} style={{ width: "100%", justifyContent: "center" }}>
              {submitting ? "Đang xác thực..." : "Đăng nhập vào Console"}
            </button>

            <div className="login-quick-demo">
              <div className="quick-demo-header">
                <span className="quick-demo-title">
                  <I name="users" size={13} /> Tài khoản demo
                </span>
                <span className="quick-demo-pass">Mật khẩu: <code>ChangeMe123!</code></span>
              </div>
              <div className="quick-demo-grid">
                {DEMO_ACCOUNTS.map((acc) => {
                  const isSelected = email === acc.email;
                  return (
                    <button
                      key={acc.email}
                      type="button"
                      className={`demo-pill ${isSelected ? "active" : ""}`}
                      onClick={() => selectDemo(acc)}
                    >
                      <span className="demo-pill-title">{acc.name}</span>
                      <span className="demo-pill-sub">{acc.sub}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </form>

          <footer className="login-legal">
            <span className="legal-copy">Distributed Workflow Orchestration Platform © 2026</span>
          </footer>
        </div>
      </section>

      <aside className="login-hero">
        <div className="login-hero-content">
          <div className="login-hero-badge">
            <span className="hero-badge-dot" />
            High Performance DAG Engine
          </div>
          <h2>Điều phối tiến trình phân tán,<br />tin cậy và mở rộng</h2>
          <p>Nền tảng quản lý, lập lịch và giám sát luồng công việc phức tạp theo đồ thị DAG trên các cụm Worker phân tán.</p>
          <ul className="login-hero-features">
            <li>
              <span className="hero-check"><I name="check" size={12} /></span>
              <span>Đồ thị DAG & State Machine tự động giải phóng Step</span>
            </li>
            <li>
              <span className="hero-check"><I name="check" size={12} /></span>
              <span>Distributed Worker Queue & Quản lý Heartbeat</span>
            </li>
            <li>
              <span className="hero-check"><I name="check" size={12} /></span>
              <span>Cơ chế Retry Policy & bù trừ lỗi thông minh</span>
            </li>
            <li>
              <span className="hero-check"><I name="check" size={12} /></span>
              <span>Nhật ký kiểm toán & vết thực thi phân tán (Trace)</span>
            </li>
          </ul>
        </div>
      </aside>
    </div>
  );
}
