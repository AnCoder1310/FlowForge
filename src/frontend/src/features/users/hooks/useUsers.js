import { useEffect, useState, useCallback } from "react";
import { listUsers } from "../services/userService";

export function useUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listUsers();
      setUsers(Array.isArray(res) ? res : []);
    } catch (err) {
      setError(err.message || "Lỗi nạp danh sách users");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  return { users, loading, error, refresh: fetchUsers };
}
