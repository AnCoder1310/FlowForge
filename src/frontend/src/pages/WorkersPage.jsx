import { useOrchestrator } from "../lib/store";
import { I } from "../lib/icons";

export default function WorkersPage() {
  const { workers } = useOrchestrator();

  return (
    <div className="workers-page">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: "700" }}>Distributed Workers & Task Queues</h2>
          <p style={{ margin: "4px 0 0 0", color: "#64748b", fontSize: "0.875rem" }}>
            Trạng thái các Worker node trong cụm và phân bổ hàng đợi tác vụ
          </p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "20px", marginBottom: "24px" }}>
        {workers.map((w) => (
          <div key={w.workerId} className="card" style={{ padding: "18px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: w.status === "ONLINE" ? "#10b981" : "#ef4444" }} />
                <div>
                  <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: "600" }}>{w.workerId}</h3>
                  <span style={{ fontSize: "0.75rem", color: "#64748b" }}>{w.hostname}</span>
                </div>
              </div>
              <span className={`badge ${w.status === "ONLINE" ? "success" : "danger"}`}>{w.status}</span>
            </div>

            <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: "12px", marginTop: "12px", fontSize: "0.85rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                <span style={{ color: "#64748b" }}>Tải hiện tại:</span>
                <span style={{ fontWeight: "600" }}>{w.currentLoad} / {w.maxConcurrency} slots</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                <span style={{ color: "#64748b" }}>Heartbeat gần nhất:</span>
                <span style={{ fontWeight: "500", color: "#10b981" }}>Vừa xong</span>
              </div>
              <div style={{ marginTop: "10px" }}>
                <span style={{ fontSize: "0.8rem", color: "#64748b", display: "block", marginBottom: "4px" }}>Hàng đợi hỗ trợ:</span>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                  {w.supportedQueues?.map((q) => (
                    <span key={q} style={{ backgroundColor: "#f1f5f9", padding: "2px 8px", borderRadius: "4px", fontSize: "0.75rem", fontFamily: "monospace" }}>
                      {q}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Queue Overview */}
      <div className="card" style={{ padding: "20px" }}>
        <h3 style={{ margin: "0 0 16px 0", fontSize: "1.05rem", fontWeight: "600" }}>Tổng Quan Task Queues</h3>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Tên Hàng Đợi (Queue)</th>
                <th>Workers Lắng Nghe</th>
                <th>Tác Vụ Chờ Xử Lý</th>
                <th>Trạng Thái Dispatch</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><code>default</code></td>
                <td>3 workers</td>
                <td>0 tasks</td>
                <td><span className="badge success">ACTIVE</span></td>
              </tr>
              <tr>
                <td><code>compute</code></td>
                <td>2 workers</td>
                <td>1 task</td>
                <td><span className="badge success">ACTIVE</span></td>
              </tr>
              <tr>
                <td><code>data-io</code></td>
                <td>1 worker</td>
                <td>0 tasks</td>
                <td><span className="badge success">ACTIVE</span></td>
              </tr>
              <tr>
                <td><code>payment</code></td>
                <td>1 worker</td>
                <td>0 tasks</td>
                <td><span className="badge success">ACTIVE</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
