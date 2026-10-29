import { api, setAccessToken } from "../../../lib/api";
import { saveSession, clearSession } from "../../../lib/auth";

/**
 * Đăng nhập hệ thống và lưu token.
 */
export async function login(email, password, remember = true) {
  const res = await api.post("/auth/login", { email, password });
  const user = {
    id: res.user.id,
    name: res.user.fullName,
    email: res.user.email,
    role: res.user.role,
    avatar: res.user.avatarUrl,
    token: res.accessToken,
  };
  setAccessToken(res.accessToken);
  saveSession(user, remember);
  return user;
}

/**
 * Đăng xuất và xóa phiên làm việc.
 */
export async function logout() {
  try {
    await api.post("/auth/logout");
  } catch {}
  setAccessToken(null);
  clearSession();
}
