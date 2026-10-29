import { useFinance } from "../../../lib/store";
import { I } from "../../../lib/icons";

export default function WorkersPage() {
  const { workers, metrics } = useFinance();

  const totalSlots = workers.reduce((acc, w) => acc + (w.maxConcurrency || 4), 0);
  const usedSlots = workers.reduce((acc, w) => acc + (w.currentLoad || 0), 0);
  const utilization = totalSlots > 0 ? Math.round((usedSlots / totalSlots) * 100) : 0;

  const queueOverview = [
    { name: "default", type: "Standard IO / Dispatch", workersCount: 3, pending: 0, status: "ACTIVE" },
    { name: "compute", type: "High-CPU Number Crunching", workersCount: 2, pending: 1, status: "ACTIVE" },
    { name: "data-io", type: "Database & S3 ETL Operations", workersCount: 1, pending: 0, status: "ACTIVE" },
    { name: "payment", type: "PCI-DSS Payment Gateway", workersCount: 1, pending: 0, status: "ACTIVE" },
    { name: "ai-agent", type: "LLM Inference & Self-Healing", workersCount: 2, pending: 0, status: "ACTIVE" },
  ];

  return (
    <div className="orch-page-wrap">
      {/* Header */}
      <div className="orch-page-header">
        <div>
          <h2 className="orch-page-heading">Cụm Workers & Hàng Đợi (Distributed Workers)</h2>
          <p className="orch-page-sub">
            Giám sát sức khỏe node thực thi phân tán, heartbeat định kỳ và định tuyến theo queue
          </p>
        </div>
        <div className="orch-cluster-summary-pill">
          <span className="orch-pulse-dot" />
          <span>Tổng tải cụm: <strong>{utilization}% ({usedSlots}/{totalSlots} slots)</strong></span>
        </div>
      </div>

      {/* Worker Nodes Grid */}
      <div className="orch-card-grid-3">
        {workers.map((w) => {
          const loadPct = w.maxConcurrency > 0 ? Math.round(((w.currentLoad || 0) / w.maxConcurrency) * 100) : 0;
          const isOnline = w.status === "ONLINE";

          return (
            <div key={w.workerId} className="orch-card orch-worker-card">
              <div className="orch-worker-header">
                <div className="orch-worker-title-wrap">
                  <div className={`orch-worker-avatar ${isOnline ? "online" : "offline"}`}>
                    <I name="server" size={20} />
                  </div>
                  <div>
                    <h3 className="orch-worker-id">{w.workerId}</h3>
                    <span className="orch-worker-host">{w.hostname}</span>
                  </div>
                </div>
                <span className={`orch-badge-status ${isOnline ? "completed" : "failed"}`}>
                  {isOnline && <span className="orch-pulse-dot" />}
                  {w.status}
                </span>
              </div>

              {/* Concurrency Slots Progress */}
              <div className="orch-worker-load-section">
                <div className="orch-worker-load-header">
                  <span className="orch-meta-label">Slot Concurrency Sử Dụng:</span>
                  <strong className="orch-load-val">{w.currentLoad || 0} / {w.maxConcurrency} slots</strong>
                </div>
                <div className="orch-progress-track">
                  <div
                    className={`orch-progress-fill ${loadPct > 80 ? "failed" : loadPct > 50 ? "running" : "completed"}`}
                    style={{ width: `${Math.max(loadPct, 6)}%` }}
                  />
                </div>
              </div>

              {/* Heartbeat & System Telemetry */}
              <div className="orch-worker-meta-grid">
                <div className="orch-worker-meta-item">
                  <span className="orch-meta-label">Heartbeat gần nhất:</span>
                  <span className="orch-meta-val orch-text-emerald">Vừa gửi (1s trước)</span>
                </div>
                <div className="orch-worker-meta-item">
                  <span className="orch-meta-label">Phiên bản Agent:</span>
                  <span className="orch-meta-val">DWOP Worker v2.4</span>
                </div>
              </div>

              {/* Supported Queues */}
              <div className="orch-worker-queues">
                <span className="orch-meta-label">Hàng đợi đã đăng ký:</span>
                <div className="orch-queue-tag-list">
                  {(w.supportedQueues || []).map((q) => (
                    <span key={q} className="orch-queue-tag">
                      <I name="network" size={11} /> {q}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Task Queue Breakdown Table */}
      <div className="orch-card" style={{ marginTop: "24px" }}>
        <div className="orch-card-head">
          <div>
            <h2 className="orch-card-title">Phân Phối Tác Vụ Theo Hàng Đợi (Task Queue Routing)</h2>
            <p className="orch-card-sub">Hàng đợi chuyên biệt giúp cô lập tải trọng giữa các bước tính toán nặng và IO nhanh</p>
          </div>
          <span className="orch-tag blue">5 Kênh Dispatch Hoạt Động</span>
        </div>

        <div className="orch-table-container">
          <table className="orch-table">
            <thead>
              <tr>
                <th>Tên Hàng Đợi (Queue Name)</th>
                <th>Mục Đích Phân Tải</th>
                <th>Workers Lắng Nghe</th>
                <th>Tác Vụ Trong Hàng Đợi</th>
                <th>Chính Sách Điều Phối</th>
                <th style={{ textAlign: "right" }}>Trạng Thái Kênh</th>
              </tr>
            </thead>
            <tbody>
              {queueOverview.map((q) => (
                <tr key={q.name} className="orch-table-row">
                  <td>
                    <code className="orch-code-pill highlight">{q.name}</code>
                  </td>
                  <td>
                    <span className="orch-cell-wfname">{q.type}</span>
                  </td>
                  <td>
                    <span className="orch-cell-meta-icon"><I name="server" size={14} /> {q.workersCount} worker nodes</span>
                  </td>
                  <td>
                    <span className={`orch-queue-pending ${q.pending > 0 ? "has-load" : ""}`}>
                      {q.pending} pending tasks
                    </span>
                  </td>
                  <td>
                    <span className="orch-tag neutral">Fair-Share FIFO</span>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <span className="orch-badge-status completed">
                      <span className="orch-pulse-dot" /> ACTIVE
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
