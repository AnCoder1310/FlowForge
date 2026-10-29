import { useEffect, useState, useCallback } from "react";
import { listWorkflows } from "../services/workflowService";

export function useWorkflows() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchWorkflows = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listWorkflows();
      setItems(res?.items || []);
    } catch (err) {
      setError(err.message || "Lỗi nạp danh sách workflow");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWorkflows();
  }, [fetchWorkflows]);

  return { items, loading, error, refresh: fetchWorkflows };
}
