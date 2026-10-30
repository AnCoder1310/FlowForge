
import { useMemo, useState } from "react";
import { I } from "../../../lib/icons";
import { initials, roleUi } from "../../../lib/format";
import { useOrchestrator } from "../../../lib/store";
import { useAuditLogs } from "../hooks/useAuditLogs";

const ACT = {
  LOGIN: ["neutral", "Đăng nhập"],
  LOGOUT: ["neutral", "Đăng xuất"],
  INSERT: ["ok", "Tạo mới"],
  CREATE: ["ok", "Tạo mới"],
  CREATE_WORKFLOW: ["ok", "Tạo workflow"],
  UPDATE: ["info", "Cập nhật"],
  UPDATE_WORKFLOW: ["info", "Cập nhật workflow"],
  DELETE: ["fail", "Xóa"],
  DELETE_WORKFLOW: ["fail", "Xóa workflow"],
  TRIGGER: ["ok", "Kích hoạt"],
  TRIGGER_RUN: ["ok", "Kích hoạt"],
  CANCEL: ["fail", "Hủy lượt chạy"],
  CANCEL_RUN: ["fail", "Hủy lượt chạy"],
  SKIP: ["warn", "Bỏ qua step"],
  SKIP_TASK: ["warn", "Bỏ qua step"],
  RETRY: ["info", "Thử lại"],
  RETRY_TASK: ["info", "Thử lại"],
  FAIL: ["fail", "Thất bại"],
  FAIL_TASK: ["fail", "Thất bại"],
  IMPORT: ["warn", "Nhập file"],
  EXPORT: ["ok", "Xuất file"],
};

const PAGE_SIZE = 20;

function fmtTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  const p = (n) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export default function AuditPage() {
  const { users, userName, current } = useOrchestrator();

  const [q, setQ] = useState("");
  const [action, setAction] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);

  const {
    items = [],
    meta = { page: 1, pageSize: 20, totalItems: 0, totalPages: 1 },
    loading = false,
    error = "",
    refresh,
  } = useAuditLogs(
    { action, dateFrom, dateTo },
    page,
    PAGE_SIZE
  );

  const setFilter = (setter) => (e) => {
    setter(e.target.value);
    setPage(1);
  };

  const getUserName = (userId) => {
    if (typeof userName === "function") {
      try {
        return userName(userId);
      } catch {
        // fallback
      }
    }
    const u = users?.find((x) => x.id === userId);
    return u?.name || u?.fullName || (userId ? `Người dùng #${userId}` : "Hệ thống");
  };

  const rows = useMemo(() => {
    const qq = q.trim().toLowerCase();
    const list = Array.isArray(items) ? items : [];

    return list
      .map((a) => {
        const user = a.actorName || getUserName(a.actorUserId);
        const userObj = users?.find((u) => u.id === a.actorUserId);
        const userRole = a.actorUserId === current?.id
          ? current?.role
          : userObj?.role;

        return {
          id: "LOG-" + String(a.id || 0).padStart(3, "0"),
          user: user === "—" ? `Người dùng #${a.actorUserId}` : user,
          role: roleUi(userRole || "ADMIN"),
          action: String(a.action || "INFO").toUpperCase(),
          module: a.module || "Hệ thống",
          detail: a.detail || "—",
          time: fmtTime(a.changedAt || a.createdAt),
        };
      })
      .filter(
        (a) =>
          !qq ||
          `${a.id}${a.action}${a.detail}${a.user}${a.module}`
            .toLowerCase()
            .includes(qq)
      );
  }, [items, q, users, userName, current]);

  const uniqueUsers = new Set(
    (items || []).map((a) => a.actorUserId).filter(Boolean)
  ).size;

  const kpis = [
    {
      label: "Tổng số nhật ký",
      value: meta?.totalItems ?? (items?.length || 0),
      icon: "file-text",
      color: "blue",
      description: "Toàn bộ hệ thống",
    },
    {
      label: "Nhật ký trang này",
      value: items?.length || 0,
      icon: "activity",
      color: "green",
      description: "Bản ghi hiện tại",
    },
    {
      label: "Người thực hiện",
      value: uniqueUsers,
      icon: "users",
      color: "purple",
      description: "Trong trang hiện tại",
    },
  ];

  const clearFilters = () => {
    setQ("");
    setAction("");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  };

  return (
    <div className="audit-page">
      <style>{`
        .audit-page {
          display: flex;
          flex-direction: column;
          gap: 22px;
          width: 100%;
          padding-bottom: 28px;
          color: #17243a;
        }

        .audit-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
        }

        .audit-breadcrumb {
          color: #94a3b8;
          font-size: 12px;
          margin-bottom: 10px;
        }

        .audit-breadcrumb span {
          margin: 0 7px;
          color: #cbd5e1;
        }

        .audit-breadcrumb strong {
          color: #64748b;
        }

        .audit-header h1 {
          margin: 0;
          color: #17243a;
          font-size: 27px;
          font-weight: 750;
          letter-spacing: -0.8px;
        }

        .audit-header p {
          margin: 8px 0 0;
          color: #8491a5;
          font-size: 13px;
        }

        .audit-refresh {
          height: 42px;
          padding: 0 17px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          border: none;
          border-radius: 9px;
          background: #2563eb;
          color: white;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: .2s;
          white-space: nowrap;
        }

        .audit-refresh:hover {
          background: #1d4ed8;
          box-shadow: 0 5px 14px #2563eb30;
        }

        .audit-refresh:disabled {
          opacity: .6;
          cursor: not-allowed;
        }

        .audit-kpis {
          display: grid;
          grid-template-columns: repeat(3,minmax(0,1fr));
          gap: 16px;
        }

        .audit-kpi-card {
          padding: 21px;
          border: 1px solid #e8edf3;
          border-radius: 13px;
          background: #fff;
          box-shadow: 0 2px 8px #17243a05;
          transition: .2s;
        }

        .audit-kpi-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 7px 20px #17243a0b;
        }

        .audit-kpi-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          color: #718096;
          font-size: 13px;
        }

        .audit-kpi-icon {
          width: 40px;
          height: 40px;
          display: grid;
          place-items: center;
          border-radius: 11px;
          font-size: 18px;
        }

        .audit-kpi-icon.blue {
          color: #2563eb;
          background: #edf4ff;
        }

        .audit-kpi-icon.green {
          color: #15965c;
          background: #e9f8ef;
        }

        .audit-kpi-icon.purple {
          color: #8b5cf6;
          background: #f3edff;
        }

        .audit-kpi-value {
          margin-top: 15px;
          color: #17243a;
          font-size: 30px;
          font-weight: 750;
          letter-spacing: -1px;
          line-height: 1.2;
        }

        .audit-kpi-description {
          margin-top: 7px;
          color: #9aa6b6;
          font-size: 12px;
        }

        .audit-filter-card,
        .audit-table-card {
          border: 1px solid #e8edf3;
          border-radius: 13px;
          background: #fff;
          box-shadow: 0 2px 8px #17243a04;
        }

        .audit-filter-card {
          padding: 21px;
        }

        .audit-section-heading,
        .audit-table-heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          margin-bottom: 19px;
        }

        .audit-section-heading h3,
        .audit-table-heading h3 {
          margin: 0;
          color: #17243a;
          font-size: 15px;
          font-weight: 700;
        }

        .audit-section-heading p,
        .audit-table-heading p {
          margin: 5px 0 0;
          color: #94a3b8;
          font-size: 12px;
        }

        .audit-clear {
          display: flex;
          align-items: center;
          gap: 7px;
          padding: 7px;
          border: none;
          background: transparent;
          color: #64748b;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
        }

        .audit-clear:hover {
          color: #2563eb;
        }

        .audit-filters {
          display: grid;
          grid-template-columns: minmax(200px,1.7fr) repeat(3,minmax(130px,1fr));
          gap: 12px;
        }

        .audit-search,
        .audit-select,
        .audit-date {
          height: 43px;
          min-width: 0;
          display: flex;
          align-items: center;
          gap: 9px;
          padding: 0 12px;
          border: 1px solid #e5eaf1;
          border-radius: 8px;
          background: #fff;
          transition: .2s;
        }

        .audit-search:focus-within,
        .audit-select:focus-within,
        .audit-date:focus-within {
          border-color: #8bb4ff;
          box-shadow: 0 0 0 3px #2563eb12;
        }

        .audit-search {
          color: #94a3b8;
        }

        .audit-search input {
          width: 100%;
          min-width: 0;
          border: none;
          outline: none;
          background: transparent;
          color: #17243a;
          font-size: 12px;
        }

        .audit-search input::placeholder {
          color: #a3afbd;
        }

        .audit-select,
        .audit-date {
          flex-direction: column;
          align-items: stretch;
          justify-content: center;
          gap: 2px;
        }

        .audit-select span,
        .audit-date span {
          color: #94a3b8;
          font-size: 10px;
        }

        .audit-select select,
        .audit-date input {
          width: 100%;
          min-width: 0;
          border: none;
          outline: none;
          background: transparent;
          color: #334155;
          font-family: inherit;
          font-size: 12px;
        }

        .audit-error {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 13px 16px;
          border: 1px solid #fecaca;
          border-radius: 9px;
          background: #fff5f5;
          color: #c53030;
          font-size: 13px;
        }

        .audit-table-card {
          overflow: hidden;
        }

        .audit-table-heading {
          padding: 21px 22px 0;
        }

        .audit-record-count {
          padding: 6px 11px;
          border-radius: 7px;
          background: #eff6ff;
          color: #2563eb;
          font-size: 11px;
          font-weight: 650;
          white-space: nowrap;
        }

        .audit-table-scroll {
          width: 100%;
          overflow-x: auto;
          margin-top: 18px;
        }

        .audit-table {
          width: 100%;
          min-width: 1050px;
          border-collapse: collapse;
          text-align: left;
        }

        .audit-table thead {
          background: #f8fafc;
        }

        .audit-table th {
          padding: 13px 17px;
          border-top: 1px solid #edf1f5;
          border-bottom: 1px solid #edf1f5;
          color: #8794a7;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: .55px;
          white-space: nowrap;
        }

        .audit-table td {
          padding: 14px 17px;
          border-bottom: 1px solid #f0f2f6;
          color: #475569;
          font-size: 12px;
          vertical-align: middle;
        }

        .audit-table tbody tr {
          transition: background .15s;
        }

        .audit-table tbody tr:hover {
          background: #f8fbff;
        }

        .audit-table tbody tr:last-child td {
          border-bottom: none;
        }

        .audit-id {
          padding: 6px 8px;
          border-radius: 6px;
          background: #eff6ff;
          color: #2563eb;
          font-family: monospace;
          font-size: 11px;
          font-weight: 650;
          white-space: nowrap;
        }

        .audit-user {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 175px;
        }

        .audit-avatar {
          width: 34px;
          height: 34px;
          flex-shrink: 0;
          display: grid;
          place-items: center;
          border-radius: 10px;
          background: #edf3ff;
          color: #326bd2;
          font-size: 11px;
          font-weight: 750;
        }

        .audit-user-info {
          display: flex;
          flex-direction: column;
          gap: 4px;
          min-width: 0;
        }

        .audit-user-info strong {
          color: #26364d;
          font-size: 12px;
          font-weight: 650;
        }

        .audit-user-info span {
          color: #9aa6b6;
          font-size: 10px;
        }

        .audit-badge {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 6px 9px;
          border-radius: 6px;
          font-size: 10px;
          font-weight: 650;
          white-space: nowrap;
        }

        .audit-badge-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: currentColor;
        }

        .audit-badge.ok {
          color: #168653;
          background: #eaf8f0;
        }

        .audit-badge.info {
          color: #2870d5;
          background: #edf4ff;
        }

        .audit-badge.warn {
          color: #b7791f;
          background: #fff7e6;
        }

        .audit-badge.fail {
          color: #d14343;
          background: #fff0f0;
        }

        .audit-badge.neutral {
          color: #64748b;
          background: #f1f4f8;
        }

        .audit-module {
          display: inline-block;
          padding: 5px 8px;
          border: 1px solid #e8edf3;
          border-radius: 6px;
          background: #fafbfd;
          color: #64748b;
          font-size: 10px;
          white-space: nowrap;
        }

        .audit-detail {
          display: block;
          max-width: 260px;
          color: #64748b;
          line-height: 1.6;
          overflow-wrap: anywhere;
        }

        .audit-time {
          color: #64748b;
          font-size: 11px;
          white-space: nowrap;
          font-variant-numeric: tabular-nums;
        }

        .audit-empty {
          min-height: 190px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 9px;
          color: #94a3b8;
        }

        .audit-empty-icon {
          width: 48px;
          height: 48px;
          display: grid;
          place-items: center;
          margin-bottom: 4px;
          border-radius: 14px;
          background: #f1f5f9;
          color: #94a3b8;
          font-size: 21px;
        }

        .audit-empty strong {
          color: #475569;
          font-size: 13px;
        }

        .audit-empty span {
          font-size: 12px;
        }

        .audit-spinner {
          width: 23px;
          height: 23px;
          border: 2px solid #e2e8f0;
          border-top-color: #2563eb;
          border-radius: 50%;
          animation: audit-spin .7s linear infinite;
        }

        @keyframes audit-spin {
          to { transform: rotate(360deg); }
        }

        .audit-pagination {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 15px 21px;
          border-top: 1px solid #edf1f5;
          color: #94a3b8;
          font-size: 12px;
        }

        .audit-pagination strong {
          color: #334155;
        }

        .audit-pagination-actions {
          display: flex;
          gap: 8px;
        }

        .audit-pagination-actions button {
          height: 34px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 0 12px;
          border: 1px solid #e5eaf1;
          border-radius: 7px;
          background: #fff;
          color: #475569;
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
          transition: .2s;
        }

        .audit-pagination-actions button:hover:not(:disabled) {
          border-color: #93b4f5;
          background: #f5f8ff;
          color: #2563eb;
        }

        .audit-pagination-actions button:disabled {
          opacity: .4;
          cursor: not-allowed;
        }

        @media (max-width: 1100px) {
          .audit-filters {
            grid-template-columns: repeat(2,minmax(0,1fr));
          }
        }

        @media (max-width: 768px) {
          .audit-page {
            gap: 16px;
          }

          .audit-header {
            align-items: flex-start;
            flex-direction: column;
          }

          .audit-header h1 {
            font-size: 23px;
          }

          .audit-refresh {
            width: 100%;
          }

          .audit-kpis {
            grid-template-columns: repeat(2,minmax(0,1fr));
            gap: 10px;
          }

          .audit-kpi-card {
            padding: 15px;
          }

          .audit-kpi-value {
            font-size: 25px;
          }

          .audit-kpi-top {
            font-size: 11px;
          }

          .audit-filter-card {
            padding: 15px;
          }

          .audit-filters {
            grid-template-columns: 1fr;
          }

          .audit-search,
          .audit-select,
          .audit-date {
            height: 46px;
          }

          .audit-section-heading {
            align-items: flex-start;
          }

          .audit-table-heading {
            padding: 16px 15px 0;
          }

          .audit-pagination {
            padding: 13px;
          }
        }

        @media (max-width: 420px) {
          .audit-kpis {
            grid-template-columns: 1fr;
          }

          .audit-section-heading {
            flex-direction: column;
          }

          .audit-pagination {
            align-items: flex-start;
            flex-direction: column;
            gap: 12px;
          }

          .audit-pagination-actions {
            width: 100%;
          }

          .audit-pagination-actions button {
            flex: 1;
          }
        }
      `}</style>

      {/* HEADER */}
      <div className="audit-header">
        <div>
          <div className="audit-breadcrumb">
            Hệ thống <span>/</span> Quản trị <span>/</span>
            <strong> Nhật ký hoạt động</strong>
          </div>

          <h1>Nhật ký hoạt động</h1>
          <p>
            Theo dõi, kiểm soát và tra cứu toàn bộ hoạt động
            trong hệ thống.
          </p>
        </div>

        <button
          className="audit-refresh"
          type="button"
          onClick={refresh}
          disabled={loading}
        >
          <I name="refresh-cw" />
          {loading ? "Đang tải..." : "Làm mới dữ liệu"}
        </button>
      </div>

      {/* KPI */}
      <div className="audit-kpis">
        {kpis.map((k) => (
          <div className="audit-kpi-card" key={k.label}>
            <div className="audit-kpi-top">
              <span>{k.label}</span>
              <div className={`audit-kpi-icon ${k.color}`}>
                <I name={k.icon} />
              </div>
            </div>

            <div className="audit-kpi-value">
              {Number(k.value).toLocaleString("vi-VN")}
            </div>

            <div className="audit-kpi-description">
              {k.description}
            </div>
          </div>
        ))}
      </div>

      {/* FILTER */}
      <section className="audit-filter-card">
        <div className="audit-section-heading">
          <div>
            <h3>Bộ lọc nhật ký</h3>
            <p>Tìm kiếm và lọc hoạt động trong hệ thống</p>
          </div>

          <button
            type="button"
            className="audit-clear"
            onClick={clearFilters}
          >
            <I name="rotate-ccw" />
            Xóa bộ lọc
          </button>
        </div>

        <div className="audit-filters">
          <label className="audit-search">
            <I name="search" />
            <input
              type="search"
              placeholder="Tìm mã log, người dùng, mô tả..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </label>

          <label className="audit-select">
            <span>Hành động</span>
            <select
              aria-label="Hành động"
              value={action}
              onChange={setFilter(setAction)}
            >
              <option value="">Tất cả hành động</option>
              {Object.entries(ACT).map(([k, v]) => (
                <option key={k} value={k}>
                  {v[1]}
                </option>
              ))}
            </select>
          </label>

          <label className="audit-date">
            <span>Từ ngày</span>
            <input
              type="date"
              value={dateFrom}
              max={dateTo || undefined}
              onChange={setFilter(setDateFrom)}
            />
          </label>

          <label className="audit-date">
            <span>Đến ngày</span>
            <input
              type="date"
              value={dateTo}
              min={dateFrom || undefined}
              onChange={setFilter(setDateTo)}
            />
          </label>
        </div>
      </section>

      {/* ERROR */}
      {error && (
        <div className="audit-error">
          <I name="alert-circle" />
          <span>{error}</span>
        </div>
      )}

      {/* TABLE */}
      <section className="audit-table-card">
        <div className="audit-table-heading">
          <div>
            <h3>Lịch sử thao tác</h3>
            <p>Chi tiết các hoạt động được ghi nhận</p>
          </div>

          <span className="audit-record-count">
            {rows.length} bản ghi
          </span>
        </div>

        <div className="audit-table-scroll">
          <table className="audit-table">
            <thead>
              <tr>
                <th>MÃ NHẬT KÝ</th>
                <th>NGƯỜI THỰC HIỆN</th>
                <th>HÀNH ĐỘNG</th>
                <th>PHÂN HỆ</th>
                <th>NỘI DUNG CHI TIẾT</th>
                <th>THỜI GIAN</th>
              </tr>
            </thead>

            <tbody>
              {loading && rows.length === 0 && (
                <tr>
                  <td colSpan={6}>
                    <div className="audit-empty">
                      <div className="audit-spinner" />
                      <span>Đang tải dữ liệu...</span>
                    </div>
                  </td>
                </tr>
              )}

              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={6}>
                    <div className="audit-empty">
                      <div className="audit-empty-icon">
                        <I name="file-search" />
                      </div>
                      <strong>Không tìm thấy nhật ký</strong>
                      <span>
                        Thử thay đổi từ khóa hoặc bộ lọc.
                      </span>
                    </div>
                  </td>
                </tr>
              )}

              {rows.map((a) => {
                const m = ACT[a.action] || [
                  "info",
                  a.action,
                ];

                return (
                  <tr key={a.id}>
                    <td>
                      <span className="audit-id">{a.id}</span>
                    </td>

                    <td>
                      <div className="audit-user">
                        <div className="audit-avatar">
                          {initials(a.user)}
                        </div>

                        <div className="audit-user-info">
                          <strong>{a.user}</strong>
                          <span>{a.role || "Người dùng"}</span>
                        </div>
                      </div>
                    </td>

                    <td>
                      <span className={`audit-badge ${m[0]}`}>
                        <span className="audit-badge-dot" />
                        {m[1]}
                      </span>
                    </td>

                    <td>
                      <span className="audit-module">
                        {a.module || "—"}
                      </span>
                    </td>

                    <td>
                      <span className="audit-detail" title={a.detail}>
                        {a.detail || "—"}
                      </span>
                    </td>

                    <td>
                      <span className="audit-time">{a.time}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* PAGINATION */}
        {(meta?.totalPages || 0) > 1 && (
          <div className="audit-pagination">
            <span>
              Trang <strong>{meta?.page || 1}</strong> /{" "}
              <strong>{meta?.totalPages || 1}</strong>
            </span>

            <div className="audit-pagination-actions">
              <button
                type="button"
                disabled={loading || page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                <I name="chevron-left" />
                Trước
              </button>

              <button
                type="button"
                disabled={loading || page >= (meta?.totalPages || 1)}
                onClick={() => setPage((p) => p + 1)}
              >
                Sau
                <I name="chevron-right" />
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
