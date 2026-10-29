import { useEffect, useState, useCallback } from "react";
import { listExecutions } from "../services/executionService";

export function useExecutions() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchExecutions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listExecutions();
      setItems(res?.items || []);
    } catch (err) {
      setError(err.message || "Lỗi nạp danh sách execution");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchExecutions();
  }, [fetchExecutions]);

  return { items, loading, error, refresh: fetchExecutions };
}
