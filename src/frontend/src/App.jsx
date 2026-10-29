import { useEffect, useLayoutEffect } from "react";
import { HashRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { FinanceProvider, useFinance } from "./lib/store";
import { PAGE_PERM, can } from "./lib/auth";
import Login from "./features/auth/pages/Login";
import Shell from "./components/Shell";
import Dashboard from "./features/dashboard/pages/Dashboard";
import WorkflowDefinitionsPage from "./features/workflows/pages/WorkflowDefinitionsPage";
import ExecutionsPage from "./features/executions/pages/ExecutionsPage";
import WorkersPage from "./features/workers/pages/WorkersPage";
import AuditPage from "./features/audit/pages/AuditPage";
import UsersPage from "./features/users/pages/UsersPage";
import ProfilePage, { Forbidden } from "./features/profile/pages/ProfilePage";

function Guard({ perm, children }) {
  const { current } = useFinance();
  if (!current) return <Navigate to="/login" replace />;
  if (perm && !can(current, perm)) return <Navigate to="/403" replace />;
  return children;
}

function BodyClass() {
  const { current, toasts } = useFinance();
  const loc = useLocation();
  useEffect(() => {
    document.body.classList.toggle("login-mode", !current || loc.pathname === "/login");
    document.body.classList.toggle("app", Boolean(current) && loc.pathname !== "/login");
  }, [current, loc.pathname]);
  return (
    <div className="toast-wrap">
      {toasts.map((t) => (
        <div key={t.id} className="toast">{t.msg}</div>
      ))}
    </div>
  );
}

function NavigationEffects() {
  const { pathname } = useLocation();

  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    document.querySelectorAll(".table-wrap").forEach((el) => {
      el.scrollLeft = 0;
    });
  }, [pathname]);

  return null;
}

function AppRoutes() {
  const { current } = useFinance();
  return (
    <>
      <BodyClass />
      <NavigationEffects />
      <Routes>
        <Route path="/login" element={current ? <Navigate to="/dashboard" replace /> : <Login />} />
        <Route element={<Guard perm={null}><Shell /></Guard>}>
          <Route path="/dashboard" element={<Guard perm={PAGE_PERM.dashboard}><Dashboard /></Guard>} />
          <Route path="/workflows" element={<Guard perm={PAGE_PERM.workflows}><WorkflowDefinitionsPage /></Guard>} />
          <Route path="/executions" element={<Guard perm={PAGE_PERM.executions}><ExecutionsPage /></Guard>} />
          <Route path="/workers" element={<Guard perm={PAGE_PERM.workers}><WorkersPage /></Guard>} />
          <Route path="/audit" element={<Guard perm={PAGE_PERM.audit}><AuditPage /></Guard>} />
          <Route path="/users" element={<Guard perm={PAGE_PERM.users}><UsersPage /></Guard>} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/403" element={<Forbidden />} />
        </Route>
        <Route path="*" element={<Navigate to={current ? "/dashboard" : "/login"} replace />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <FinanceProvider>
      <HashRouter>
        <AppRoutes />
      </HashRouter>
    </FinanceProvider>
  );
}
