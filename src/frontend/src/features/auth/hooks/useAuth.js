import { useFinance } from "../../../lib/store";

export function useAuth() {
  const { current, login, logout, can } = useFinance();
  return { user: current, login, logout, can, isAuthenticated: Boolean(current) };
}
