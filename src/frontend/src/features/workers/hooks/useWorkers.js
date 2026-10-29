import { useEffect, useState, useCallback } from "react";
import { listWorkers } from "../services/workerService";

export function useWorkers() {
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchWorkers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listWorkers();
      setWorkers(Array.isArray(res) ? res : []);
    } catch (err) {
      setError(err.message || "Lỗi nạp danh sách workers");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWorkers();
  }, [fetchWorkers]);

  return { workers, loading, error, refresh: fetchWorkers };
}
