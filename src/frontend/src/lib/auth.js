export const ROLE_LABEL = {
  ADMIN: "Administrator",
  OPERATOR: "Operations Lead",
  DEVELOPER: "Workflow Developer",
  VIEWER: "Platform Observer",
};

export const ROLE_PERMISSIONS = {
  ADMIN: {
    dashboard: true,
    workflowRead: true, workflowWrite: true,
    executionRead: true, executionTrigger: true, executionCancel: true,
    workerRead: true,
    auditRead: true,
    userManagement: true,
  },
  OPERATOR: {
    dashboard: true,
    workflowRead: true, workflowWrite: true,
    executionRead: true, executionTrigger: true, executionCancel: true,
    workerRead: true,
    auditRead: true,
    userManagement: false,
  },
  DEVELOPER: {
    dashboard: true,
    workflowRead: true, workflowWrite: true,
    executionRead: true, executionTrigger: true, executionCancel: false,
    workerRead: true,
    auditRead: false,
    userManagement: false,
  },
  VIEWER: {
    dashboard: true,
    workflowRead: true, workflowWrite: false,
    executionRead: true, executionTrigger: false, executionCancel: false,
    workerRead: true,
    auditRead: false,
    userManagement: false,
  },
};

export const PAGE_PERM = {
  dashboard: "dashboard",
  workflows: "workflowRead",
  executions: "executionRead",
  workers: "workerRead",
  audit: "auditRead",
  users: "userManagement",
  profile: "dashboard",
  forbidden: "dashboard",
};

export function readSession() {
  const raw = sessionStorage.getItem("orchestrator_user") || localStorage.getItem("orchestrator_user");
  return raw ? JSON.parse(raw) : null;
}

export function saveSession(user, remember) {
  const json = JSON.stringify(user);
  sessionStorage.removeItem("orchestrator_user");
  localStorage.removeItem("orchestrator_user");
  (remember ? localStorage : sessionStorage).setItem("orchestrator_user", json);
}

export function clearSession() {
  sessionStorage.removeItem("orchestrator_user");
  localStorage.removeItem("orchestrator_user");
}

export function can(user, perm) {
  if (!user) return false;
  return Boolean(ROLE_PERMISSIONS[user.role]?.[perm]);
}
