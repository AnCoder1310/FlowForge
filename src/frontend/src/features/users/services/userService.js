import { api } from "../../../lib/api";

/**
 * Lấy danh sách người dùng hệ thống.
 */
export async function listUsers() {
  return api.get("/users");
}
