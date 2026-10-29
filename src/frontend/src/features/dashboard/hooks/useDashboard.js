import { useEffect, useState } from "react";
import { getDashboard } from "../services/dashboardService";

/** Số liệu tổng hợp do máy chủ tính cho khoảng ngày; tải lại khi khoảng ngày hoặc `version` đổi. */
export function useDashboard(dateFrom, dateTo, version) {
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setError("");
    getDashboard({ dateFrom, dateTo })
      .then((res) => !cancelled && setSummary(res))
      .catch((e) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [dateFrom, dateTo, version]);

  return { summary, error };
}
