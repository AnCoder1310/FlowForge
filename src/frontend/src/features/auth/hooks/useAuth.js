import { useOrchestrator } from "../../../lib/store";

export function useAuth() {
  const { current, login, logout, can } = useOrchestrator();
  return { user: current, login, logout, can, isAuthenticated: Boolean(current) };
}
