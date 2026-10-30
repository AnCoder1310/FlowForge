import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { SAMPLE_WORKFLOWS, SAMPLE_WORKERS, SAMPLE_EXECUTIONS, AUDIT_LOGS, USERS } from "./data";
import { can as canPerm, clearSession, readSession, saveSession } from "./auth";
import { api, setAccessToken } from "./api";

const Ctx = createContext(null);

export function FinanceProvider({ children }) {
  const [current, setCurrent] = useState(() => {
    const sess = readSession();
    if (sess?.token) {
      setAccessToken(sess.token);
    }
    return sess;
  });
  const [workflows, setWorkflows] = useState(SAMPLE_WORKFLOWS);
  const [executions, setExecutions] = useState(SAMPLE_EXECUTIONS);
  const [workers, setWorkers] = useState(SAMPLE_WORKERS);
  const [audits, setAudits] = useState(AUDIT_LOGS);
  const [users, setUsers] = useState(USERS);
  const [metrics, setMetrics] = useState({
    totalWorkflows: 0,
    activeWorkflows: 0,
    runningInstances: 0,
    completedInstances: 0,
    failedInstances: 0,
    pendingTasks: 0,
    activeWorkers: 0
  });

  const [toasts, setToasts] = useState([]);
  const [confirm, setConfirm] = useState(null);

  const toast = useCallback((msg, type = "info") => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, msg, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  const login = useCallback(async (email, password, remember = true) => {
    try {
      const res = await api.post("/auth/login", { email, password });
      const user = {
        id: res.user.id,
        name: res.user.fullName,
        email: res.user.email,
        role: res.user.role,
        avatar: res.user.avatarUrl,
        timezone: res.user.timezone,
        token: res.accessToken,
      };
      setAccessToken(res.accessToken);
      saveSession(user, remember);
      setCurrent(user);
      toast("Đăng nhập thành công!", "success");
      return user;
    } catch {
      // Fallback for mock demo
      const found = users.find((u) => u.email === email && u.password === password);
      if (found) {
        const u = {
          id: found.id,
          name: found.name,
          email: found.email,
          role: found.role,
          avatar: found.avatar,
          token: "mock-token",
        };
        saveSession(u, remember);
        setCurrent(u);
        toast("Đăng nhập thành công (chế độ demo)!", "success");
        return u;
      }
      throw new Error("Email hoặc mật khẩu không chính xác.");
    }
  }, [users, toast]);

  const logout = useCallback(() => {
    clearSession();
    setAccessToken(null);
    setCurrent(null);
    toast("Đã đăng xuất khỏi hệ thống.");
  }, [toast]);

  const can = useCallback((perm) => canPerm(current, perm), [current]);

  const userName = useCallback(
    (userId) => {
      const u = users.find((x) => x.id === userId);
      return u ? u.name || u.fullName : (userId ? `Người dùng #${userId}` : "Hệ thống");
    },
    [users]
  );


  // Load from API with graceful fallback to sample state
  const loadWorkflows = useCallback(async () => {
    try {
      const res = await api.get("/workflows");
      if (res?.items) setWorkflows(res.items);
    } catch {
      // keep current sample
    }
  }, []);

  const loadExecutions = useCallback(async () => {
    try {
      const res = await api.get("/executions");
      if (res?.items) setExecutions(res.items);
    } catch {
      // keep current sample
    }
  }, []);

  const loadWorkers = useCallback(async () => {
    try {
      const res = await api.get("/workers");
      if (Array.isArray(res)) setWorkers(res);
    } catch {
      // keep current sample
    }
  }, []);

  const workflowsRef = useRef(workflows);
  const executionsRef = useRef(executions);
  const workersRef = useRef(workers);

  useEffect(() => {
    workflowsRef.current = workflows;
  }, [workflows]);

  useEffect(() => {
    executionsRef.current = executions;
  }, [executions]);

  useEffect(() => {
    workersRef.current = workers;
  }, [workers]);

  const loadMetrics = useCallback(async () => {
    try {
      const res = await api.get("/metrics/dashboard");
      if (res) {
        setMetrics((prev) => {
          if (
            prev.totalWorkflows === res.totalWorkflows &&
            prev.activeWorkflows === res.activeWorkflows &&
            prev.runningInstances === res.runningInstances &&
            prev.completedInstances === res.completedInstances &&
            prev.failedInstances === res.failedInstances &&
            prev.pendingTasks === res.pendingTasks &&
            prev.activeWorkers === res.activeWorkers
          ) {
            return prev;
          }
          return res;
        });
      }
    } catch {
      const wfs = workflowsRef.current;
      const exs = executionsRef.current;
      const wks = workersRef.current;
      const computed = {
        totalWorkflows: wfs.length,
        activeWorkflows: wfs.filter((w) => w.isActive).length,
        runningInstances: exs.filter((e) => e.status === "RUNNING").length,
        completedInstances: exs.filter((e) => e.status === "COMPLETED").length,
        failedInstances: exs.filter((e) => e.status === "FAILED").length,
        pendingTasks: exs.flatMap((e) => e.tasks || []).filter((t) => t.status === "PENDING" || t.status === "SCHEDULED").length,
        activeWorkers: wks.filter((w) => w.status === "ONLINE").length,
      };
      setMetrics((prev) => {
        if (
          prev.totalWorkflows === computed.totalWorkflows &&
          prev.activeWorkflows === computed.activeWorkflows &&
          prev.runningInstances === computed.runningInstances &&
          prev.completedInstances === computed.completedInstances &&
          prev.failedInstances === computed.failedInstances &&
          prev.pendingTasks === computed.pendingTasks &&
          prev.activeWorkers === computed.activeWorkers
        ) {
          return prev;
        }
        return computed;
      });
    }
  }, []);

  useEffect(() => {
    loadWorkflows();
    loadExecutions();
    loadWorkers();
    loadMetrics();
  }, [loadWorkflows, loadExecutions, loadWorkers, loadMetrics]);

  const triggerWorkflow = useCallback(async (workflowId, inputJson = "{}") => {
    try {
      const res = await api.post(`/executions/workflows/${workflowId}/trigger`, { inputPayloadJson: inputJson });
      setExecutions((prev) => [res, ...prev]);
      toast(`Đã kích hoạt workflow #${res.id}!`, "success");
      loadMetrics();
      return res;
    } catch {
      // Mock trigger
      const wf = workflows.find((w) => w.id === workflowId);
      const newInst = {
        id: Date.now(),
        workflowId,
        workflowName: wf?.name || "Workflow",
        version: wf?.version || 1,
        status: "RUNNING",
        inputPayloadJson: inputJson,
        contextDataJson: "{}",
        startedAt: new Date().toISOString(),
        completedAt: null,
        createdAt: new Date().toISOString(),
        tasks: (wf?.dag?.steps || []).map((s, idx) => ({
          id: Date.now() + idx,
          stepId: s.id,
          stepName: s.name,
          status: idx === 0 ? "RUNNING" : "PENDING",
          queueName: s.queue || "default",
          retryCount: 0,
          assignedWorkerId: idx === 0 ? workers[0]?.workerId : null,
        }))
      };
      setExecutions((prev) => [newInst, ...prev]);
      toast(`Đã kích hoạt execution #${newInst.id} (demo)!`, "success");
      return newInst;
    }
  }, [workflows, workers, toast, loadMetrics]);

  const cancelExecution = useCallback(async (id) => {
    try {
      await api.post(`/executions/${id}/cancel`);
    } catch {
      // mock cancel
    }
    setExecutions((prev) =>
      prev.map((e) => (e.id === id ? { ...e, status: "CANCELLED", completedAt: new Date().toISOString() } : e))
    );
    toast(`Đã hủy lượt chạy #${id}`);
    loadMetrics();
  }, [toast, loadMetrics]);

  const createWorkflow = useCallback(async (data) => {
    try {
      const res = await api.post("/workflows", data);
      setWorkflows((prev) => [res, ...prev]);
      toast("Tạo mới workflow thành công!", "success");
      loadMetrics();
      return res;
    } catch {
      const newWf = {
        id: Date.now(),
        name: data.name,
        version: 1,
        description: data.description,
        isActive: true,
        createdBy: current?.id,
        createdAt: new Date().toISOString(),
        dag: data.dag,
      };
      setWorkflows((prev) => [newWf, ...prev]);
      toast("Đã tạo workflow (demo)!", "success");
      return newWf;
    }
  }, [current, toast, loadMetrics]);

  const updateWorkflow = useCallback(async (workflowId, data) => {
    try {
      const res = await api.put(`/workflows/${workflowId}`, data);
      setWorkflows((prev) => prev.map((w) => (w.id === workflowId ? res : w)));
      toast(`Cập nhật workflow #${workflowId} thành công!`, "success");
      loadMetrics();
      return res;
    } catch (err) {
      toast(err.message || "Lỗi cập nhật workflow", "danger");
      throw err;
    }
  }, [toast, loadMetrics]);

  const deleteWorkflow = useCallback(async (workflowId) => {
    try {
      await api.delete(`/workflows/${workflowId}`);
      setWorkflows((prev) => prev.filter((w) => w.id !== workflowId));
      toast(`Đã xóa workflow #${workflowId} thành công!`, "info");
      loadMetrics();
    } catch (err) {
      toast(err.message || "Lỗi xóa workflow", "danger");
    }
  }, [toast, loadMetrics]);

  const value = useMemo(
    () => ({
      current,
      login,
      logout,
      can,
      userName,
      workflows,
      executions,
      workers,
      audits,
      users,
      metrics,
      toasts,
      toast,
      confirm,
      setConfirm,
      loadWorkflows,
      loadExecutions,
      loadWorkers,
      loadMetrics,
      triggerWorkflow,
      cancelExecution,
      createWorkflow,
      updateWorkflow,
      deleteWorkflow,
    }),
    [
      current,
      login,
      logout,
      can,
      userName,
      workflows,
      executions,
      workers,
      audits,
      users,
      metrics,
      toasts,
      toast,
      confirm,
      loadWorkflows,
      loadExecutions,
      loadWorkers,
      loadMetrics,
      triggerWorkflow,
      cancelExecution,
      createWorkflow,
      updateWorkflow,
      deleteWorkflow,
    ]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useFinance() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useFinance must be inside FinanceProvider");
  return c;
}
