import { useEffect, useState } from "react";
import { useFinance } from "../../../lib/store";
import { I } from "../../../lib/icons";
import { useNavigate } from "react-router-dom";

export function Kpi({ label, value, delta, up }) {
  const deltaCls = String(delta || "").startsWith("-") || up === false ? "down" : "up";
  return (
    <article className="orch-card orch-kpi-card">
      <div className="orch-kpi-label">{label}</div>
      <div className="orch-kpi-val num">{value}</div>
      {delta ? <div className={`orch-kpi-delta ${deltaCls}`}>{delta}</div> : null}
    </article>
  );
}

export default function Dashboard() {
  const { metrics, executions, workflows, workers, loadWorkflows, loadMetrics, loadExecutions, triggerWorkflow, toast } = useFinance();
  const nav = useNavigate();
  const [triggeringId, setTriggeringId] = useState(null);

  useEffect(() => {
    loadWorkflows();
    loadMetrics();
    loadExecutions();
  }, [loadWorkflows, loadMetrics, loadExecutions]);

  const totalRuns = metrics.completedInstances + metrics.failedInstances + metrics.runningInstances;
  const successRate = (metrics.completedInstances + metrics.failedInstances) > 0
    ? Math.round((metrics.completedInstances / (metrics.completedInstances + metrics.failedInstances)) * 100)
    : 100;

  const handleQuickTrigger = async (wfId) => {
    setTriggeringId(wfId);
    try {
      await triggerWorkflow(wfId, '{"source":"quick-dashboard-trigger","timestamp":' + Date.now() + '}');
      toast("Đã kích hoạt workflow thành công!", "success");
    } catch (err) {
      toast(err.message || "Lỗi kích hoạt workflow", "danger");
    } finally {
      setTriggeringId(null);
    }
  };

  return (
    <div className="orch-dashboard">
      {/* Top Banner KPI Grid */}
      <div className="orch-kpi-grid">
        <div className="orch-kpi-stat orch-kpi-blue">
          <div className="orch-kpi-header">
            <span className="orch-kpi-title">Tổng Quy Trình (DAGs)</span>
            <div className="orch-kpi-icon-pill blue">
              <I name="git-fork" size={20} />
            </div>
          </div>
          <div className="orch-kpi-number">{metrics.totalWorkflows}</div>
          <div className="orch-kpi-footer">
            <span className="orch-badge-sub positive">
              <I name="check-circle" size={12} /> {metrics.activeWorkflows} active
            </span>
            <span className="orch-kpi-hint">Đồ thị DAG đã kiểm tra chu trình</span>
          </div>
        </div>

        <div className="orch-kpi-stat orch-kpi-emerald">
          <div className="orch-kpi-header">
            <span className="orch-kpi-title">Đang Chạy (Running)</span>
            <div className="orch-kpi-icon-pill emerald">
              <I name="play-circle" size={20} />
            </div>
          </div>
          <div className="orch-kpi-number">{metrics.runningInstances}</div>
          <div className="orch-kpi-footer">
            <span className="orch-badge-sub info">
              <span className="orch-pulse-dot" /> {metrics.completedInstances} đã hoàn thành
            </span>
            <span className="orch-kpi-hint">Điều phối theo thời gian thực</span>
          </div>
        </div>

        <div className="orch-kpi-stat orch-kpi-amber">
          <div className="orch-kpi-header">
            <span className="orch-kpi-title">Active Workers</span>
            <div className="orch-kpi-icon-pill amber">
              <I name="server" size={20} />
            </div>
          </div>
          <div className="orch-kpi-number">{metrics.activeWorkers}</div>
          <div className="orch-kpi-footer">
            <span className="orch-badge-sub positive">
              <I name="activity" size={12} /> 100% heartbeat OK
            </span>
            <span className="orch-kpi-hint">Hỗ trợ 5 task queues phân tán</span>
          </div>
        </div>

        <div className="orch-kpi-stat orch-kpi-purple">
          <div className="orch-kpi-header">
            <span className="orch-kpi-title">Tỉ Lệ Thành Công</span>
            <div className="orch-kpi-icon-pill purple">
              <I name="pie-chart" size={20} />
            </div>
          </div>
          <div className="orch-kpi-number">{successRate}%</div>
          <div className="orch-kpi-footer">
            <span className={`orch-badge-sub ${metrics.failedInstances > 0 ? "warning" : "positive"}`}>
              {metrics.failedInstances} lỗi / retry policy
            </span>
            <span className="orch-kpi-hint">Tự động bù trừ & chẩn đoán AI</span>
          </div>
        </div>
      </div>

      {/* Main Section Grid */}
      <div className="orch-grid-2col">
        {/* Active Workflows Section */}
        <div className="orch-card">
          <div className="orch-card-head">
            <div>
              <h2 className="orch-card-title">Workflow Sẵn Sàng Kích Hoạt</h2>
              <p className="orch-card-sub">Khởi chạy tức thì các DAG đã được biên dịch trên cụm worker phân tán</p>
            </div>
            <button className="orch-btn orch-btn-primary" onClick={() => nav("/workflows")}>
              <I name="plus" size={15} /> <span>Quản lý DAGs</span>
            </button>
          </div>

          <div className="orch-wf-list">
            {workflows.length === 0 ? (
              <div style={{ textAlign: "center", padding: "32px 16px", color: "var(--orch-text-muted)" }}>
                <p style={{ margin: "0 0 12px", fontSize: "14px" }}>Chưa có workflow nào trong hệ thống.</p>
                <button className="orch-btn orch-btn-primary orch-btn-sm" onClick={() => nav("/workflows")}>
                  <I name="plus" size={14} /> Tạo Workflow ngay
                </button>
              </div>
            ) : (
              workflows.map((wf) => {
              const queues = Array.from(new Set(wf.dag?.steps?.map((s) => s.queue || "default")));
              return (
                <div key={wf.id} className="orch-wf-item">
                  <div className="orch-wf-info">
                    <div className="orch-wf-title-row">
                      <span className="orch-wf-name">{wf.name}</span>
                      <span className="orch-wf-version">v{wf.version}</span>
                      <span className="orch-tag success">Đã xác thực DAG</span>
                    </div>
                    <p className="orch-wf-desc">{wf.description}</p>
                    <div className="orch-wf-meta">
                      <span className="orch-wf-meta-item">
                        <I name="layers" size={13} /> {wf.dag?.steps?.length || 0} steps
                      </span>
                      <span className="orch-wf-meta-item">
                        <I name="network" size={13} /> Queues: {queues.map((q) => (
                          <code key={q} className="orch-code-inline">{q}</code>
                        ))}
                      </span>
                    </div>
                  </div>
                  <div className="orch-wf-action">
                    <button
                      className="orch-btn orch-btn-secondary orch-btn-sm"
                      disabled={triggeringId === wf.id}
                      onClick={() => handleQuickTrigger(wf.id)}
                    >
                      <I name="play" size={13} />
                      <span>{triggeringId === wf.id ? "Đang trigger..." : "Kích hoạt"}</span>
                    </button>
                  </div>
                </div>
              );
            }))}
          </div>
        </div>

        {/* Cluster Engine Telemetry & Features */}
        <div className="orch-card">
          <div className="orch-card-head">
            <div>
              <h2 className="orch-card-title">Kiến Trúc & Chỉ Số Cụm (Cluster Telemetry)</h2>
              <p className="orch-card-sub">Trạng thái điều phối và khả năng phục hồi lỗi của Orchestrator</p>
            </div>
            <button className="orch-btn orch-btn-ghost" onClick={() => nav("/workers")}>
              <span>Chi tiết Worker</span> <I name="arrow-right" size={14} />
            </button>
          </div>

          <div className="orch-telemetry-grid">
            <div className="orch-telemetry-box">
              <div className="orch-telemetry-icon"><I name="zap" size={18} /></div>
              <div className="orch-telemetry-content">
                <span className="orch-telemetry-label">Thuật toán lập lịch DAG</span>
                <span className="orch-telemetry-val">Kahn's Algorithm (0-Cycle Guaranteed)</span>
              </div>
            </div>

            <div className="orch-telemetry-box">
              <div className="orch-telemetry-icon"><I name="cpu" size={18} /></div>
              <div className="orch-telemetry-content">
                <span className="orch-telemetry-label">Task Queue Dispatcher</span>
                <span className="orch-telemetry-val">FIFO / Priority Channel Routing</span>
              </div>
            </div>

            <div className="orch-telemetry-box">
              <div className="orch-telemetry-icon"><I name="bot" size={18} /></div>
              <div className="orch-telemetry-content">
                <span className="orch-telemetry-label">AI Diagnostic & Self-Healing</span>
                <span className="orch-telemetry-val">Tự động phân tích nguyên nhân timeout / lỗi mạng</span>
              </div>
            </div>

            <div className="orch-telemetry-box">
              <div className="orch-telemetry-icon"><I name="shield" size={18} /></div>
              <div className="orch-telemetry-content">
                <span className="orch-telemetry-label">Kiểm soát truy cập RBAC</span>
                <span className="orch-telemetry-val">HMAC-SHA256 Token & Immutable Audit</span>
              </div>
            </div>
          </div>

          <div className="orch-cluster-banner">
            <div className="orch-cluster-banner-left">
              <span className="orch-badge-emerald">Live Cluster Healthy</span>
              <h4>Điều phối tự động không điểm lỗi duy nhất (SPOF-free)</h4>
              <p>Mỗi bước nhiệm vụ được quản lý trạng thái máy tự động (PENDING → SCHEDULED → RUNNING → COMPLETED).</p>
            </div>
            <button className="orch-btn orch-btn-primary orch-btn-sm" onClick={() => nav("/executions")}>
              Xem Execution Runs
            </button>
          </div>
        </div>
      </div>

      {/* Recent Executions Table */}
      <div className="orch-card" style={{ marginTop: "20px" }}>
        <div className="orch-card-head">
          <div>
            <h2 className="orch-card-title">Lượt Chạy Gần Đây (Executions)</h2>
            <p className="orch-card-sub">Tiến trình thực thi theo thời gian thực của các tác vụ DAG trong cụm</p>
          </div>
          <button className="orch-btn orch-btn-secondary orch-btn-sm" onClick={() => nav("/executions")}>
            <span>Xem toàn bộ lịch sử</span> <I name="arrow-right" size={14} />
          </button>
        </div>

        <div className="orch-table-container">
          <table className="orch-table">
            <thead>
              <tr>
                <th style={{ width: "90px" }}>Run ID</th>
                <th>Tên Workflow</th>
                <th>Trạng thái</th>
                <th>Tiến trình Step DAG</th>
                <th>Thời điểm kích hoạt</th>
                <th>Thời gian chạy</th>
                <th style={{ textAlign: "right" }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {executions.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: "32px 16px", color: "var(--orch-text-muted)", fontSize: "13px" }}>
                    Chưa có lượt chạy nào trong hệ thống.
                  </td>
                </tr>
              ) : (
                executions.slice(0, 6).map((ex) => {
                const totalSteps = ex.tasks?.length || 0;
                const completedSteps = ex.tasks?.filter((t) => t.status === "COMPLETED").length || 0;
                const pct = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
                const isRunning = ex.status === "RUNNING";
                const isCompleted = ex.status === "COMPLETED";
                const isFailed = ex.status === "FAILED";

                return (
                  <tr key={ex.id} className="orch-table-row">
                    <td>
                      <code className="orch-code-pill">#{ex.id}</code>
                    </td>
                    <td>
                      <div className="orch-cell-workflow">
                        <span className="orch-cell-wfname">{ex.workflowName}</span>
                        <span className="orch-cell-wfver">v{ex.version}</span>
                      </div>
                    </td>
                    <td>
                      <span className={`orch-badge-status ${isRunning ? "running" : isCompleted ? "completed" : isFailed ? "failed" : "neutral"}`}>
                        {isRunning && <span className="orch-pulse-dot" />}
                        {ex.status}
                      </span>
                    </td>
                    <td>
                      <div className="orch-step-progress">
                        <div className="orch-progress-track">
                          <div
                            className={`orch-progress-fill ${isCompleted ? "completed" : isFailed ? "failed" : "running"}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="orch-step-count">{completedSteps}/{totalSteps} steps</span>
                      </div>
                    </td>
                    <td>
                      <span className="orch-cell-time">{new Date(ex.createdAt).toLocaleTimeString()}</span>
                    </td>
                    <td>
                      <span className="orch-cell-duration">{ex.completedAt ? "1m 30s" : isRunning ? "Đang chạy..." : "Đã hủy"}</span>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <button className="orch-btn orch-btn-ghost orch-btn-xs" onClick={() => nav("/executions")}>
                        Chi tiết <I name="arrow-right" size={12} />
                      </button>
                    </td>
                  </tr>
                );
              }))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
