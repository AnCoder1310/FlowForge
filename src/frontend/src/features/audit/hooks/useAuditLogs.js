import { useCallback, useEffect, useState } from "react";
import { listAuditLogs } from "../services/auditService";

const EMPTY_META = { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 };

/** Tải nhật ký hoạt động theo bộ lọc và trang; tự tải lại khi bộ lọc đổi. */
export function useAuditLogs(filters, page, pageSize = 20) {
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState(EMPTY_META);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tick, setTick] = useState(0);

  const { action, dateFrom, dateTo } = filters;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    listAuditLogs({ page, pageSize, action, dateFrom, dateTo })
      .then((res) => {
        if (cancelled) return;
        setItems(res.items);
        setMeta(res.meta);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [action, dateFrom, dateTo, page, pageSize, tick]);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  return { items, meta, loading, error, refresh };
}
