import { useEffect } from "react";
import { useFinance } from "../../../lib/store";
import { I } from "../../../lib/icons";

export default function WorkersPage() {
  const { workers, metrics, loadWorkers } = useFinance();

  useEffect(() => {
    if (loadWorkers) loadWorkers();
  }, [loadWorkers]);

  const totalSlots = workers.reduce((acc, w) => acc + (w.maxConcurrency || 4), 0);
  const usedSlots = workers.reduce((acc, w) => acc + (w.currentLoad || 0), 0);
  const utilization = totalSlots > 0 ? Math.round((usedSlots / totalSlots) * 100) : 0;

  const queueMeta = [
    { name: "default", type: "Standard IO / Webhook Dispatch" },
    { name: "compute", type: "High-CPU Distributed Processing" },
    { name: "ai-agent", type: "LLM Reasoning & Anomaly Detection" },
    { name: "data-io", type: "Analytical Warehouse & Parquet ETL" },
    { name: "payment", type: "PCI-DSS Payment Gateway & Saga" },
  ];

  const queueOverview = queueMeta.map((q) => {
    const matchingWorkers = workers.filter((w) => (w.supportedQueues || []).includes(q.name));
    return {
      name: q.name,
      type: q.type,
      workersCount: matchingWorkers.length,
      pending: metrics?.pendingTasks || 0,
      status: matchingWorkers.length > 0 ? "ACTIVE" : "STANDBY",
    };
  });

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
      {workers.length === 0 ? (
        <div className="orch-card" style={{ textAlign: "center", padding: "40px 16px", color: "var(--orch-text-muted)" }}>
          <div style={{ display: "inline-flex", padding: "14px", borderRadius: "50%", background: "var(--orch-border-subtle)", marginBottom: "12px" }}>
            <I name="server" size={28} />
          </div>
          <h4 style={{ margin: "0 0 6px", fontSize: "16px", fontWeight: "600" }}>Chưa có Worker Node nào trực tuyến</h4>
          <p style={{ margin: 0, fontSize: "13px" }}>
            Khởi động Worker daemon lắng nghe 5 task queues bằng lệnh: <code className="orch-code-inline">./run.sh worker</code>
          </p>
        </div>
      ) : (
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
                  <span className="orch-meta-label">Tác vụ đã xử lý:</span>
                  <strong className="orch-meta-val orch-text-emerald">{w.completedTasks || 0} tasks</strong>
                </div>
                <div className="orch-worker-meta-item">
                  <span className="orch-meta-label">Heartbeat:</span>
                  <span className="orch-meta-val">{isOnline ? "Vừa gửi (1s trước)" : "Mất kết nối"}</span>
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
      )}

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

      {/* Task Distribution by Worker Table */}
      <div className="orch-card" style={{ marginTop: "24px" }}>
        <div className="orch-card-head">
          <div>
            <h2 className="orch-card-title">Phân Bổ Tác Vụ Theo Từng Worker Node (Worker Distribution Telemetry)</h2>
            <p className="orch-card-sub">Thống kê chi tiết tải trọng, tác vụ đã hoàn thành và trạng thái thực thi của từng Worker</p>
          </div>
          <span className="orch-tag purple">{workers.length} Nodes Trực Tuyến</span>
        </div>

        <div className="orch-table-container">
          <table className="orch-table">
            <thead>
              <tr>
                <th>Worker ID</th>
                <th>Máy Chủ (Hostname)</th>
                <th>Hàng Đợi Đảm Nhận</th>
                <th>Tải Hiện Tại (Slots)</th>
                <th>Tác Vụ Hoàn Thành</th>
                <th>Tỷ Lệ Tải</th>
                <th style={{ textAlign: "right" }}>Trạng Thái</th>
              </tr>
            </thead>
            <tbody>
              {workers.map((w) => {
                const loadPct = w.maxConcurrency > 0 ? Math.round(((w.currentLoad || 0) / w.maxConcurrency) * 100) : 0;
                return (
                  <tr key={w.workerId} className="orch-table-row">
                    <td>
                      <code className="orch-code-pill highlight">{w.workerId}</code>
                    </td>
                    <td>
                      <span className="orch-cell-wfname">{w.hostname}</span>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                        {(w.supportedQueues || []).map((q) => (
                          <span key={q} className="orch-tag neutral" style={{ fontSize: "0.65rem", padding: "1px 6px" }}>{q}</span>
                        ))}
                      </div>
                    </td>
                    <td>
                      <strong>{w.currentLoad || 0}</strong> / {w.maxConcurrency} slots
                    </td>
                    <td>
                      <span className="orch-tag emerald" style={{ fontWeight: 600 }}>{w.completedTasks || 0} tasks</span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 600, color: loadPct > 80 ? "var(--rose)" : loadPct > 50 ? "var(--amber)" : "var(--emerald)" }}>
                        {loadPct}%
                      </span>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <span className={`orch-badge-status ${w.status === "ONLINE" ? "completed" : w.status === "BUSY" ? "running" : "failed"}`}>
                        {w.status === "ONLINE" && <span className="orch-pulse-dot" />}
                        {w.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
