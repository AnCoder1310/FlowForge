import pytest
from app.core.security import TokenService
from app.domain.models import SafeUser, UserAccount, UserRole
from app.persistence.store import store


@pytest.mark.anyio
async def test_case_1_request_without_token(client):
    """
    TEST CASE 1: Request không có token
    - Truy cập API yêu cầu xác thực mà không kèm header Authorization.
    - Expected: HTTP 401 Unauthorized.
    """
    # 1. API thông thường (profile)
    res_profile = await client.get("/api/v1/profile")
    assert res_profile.status_code == 401
    assert res_profile.json()["errorCode"] == "UNAUTHORIZED"

    # 2. API quản trị (users)
    res_users = await client.get("/api/v1/users")
    assert res_users.status_code == 401
    assert res_users.json()["errorCode"] == "UNAUTHORIZED"

    # 3. API workflows
    res_wf = await client.get("/api/v1/workflows")
    assert res_wf.status_code == 401
    assert res_wf.json()["errorCode"] == "UNAUTHORIZED"


@pytest.mark.anyio
async def test_case_2_request_with_invalid_token(client):
    """
    TEST CASE 2: Request có token sai / malformed
    - Token sai cú pháp, thiếu scheme Bearer, bị giả mạo chữ ký hoặc chuỗi mock cũ.
    - Expected: HTTP 401 Unauthorized.
    """
    invalid_headers = [
        {"Authorization": "Basic dXNlcjpwYXNz"},
        {"Authorization": "Bearer"},
        {"Authorization": "Bearer    "},
        {"Authorization": "Bearer invalid.token.payload"},
        {"Authorization": "Bearer mock-token"},
        {"Authorization": "Bearer dev-token"},
        {"Authorization": "Bearer demo-token"},
    ]

    for headers in invalid_headers:
        res = await client.get("/api/v1/profile", headers=headers)
        assert res.status_code == 401, f"Expected 401 for headers: {headers}, got {res.status_code}"
        assert res.json()["errorCode"] == "UNAUTHORIZED"

    # Token có payload hợp lệ nhưng chữ ký HMAC bị sửa đổi (tampered token)
    valid_token = TokenService.issue(1, "ADMIN")
    tampered_token = valid_token[:-4] + "ffff"
    res_tampered = await client.get("/api/v1/profile", headers={"Authorization": f"Bearer {tampered_token}"})
    assert res_tampered.status_code == 401
    assert res_tampered.json()["errorCode"] == "UNAUTHORIZED"


@pytest.mark.anyio
async def test_case_3_request_with_expired_token(client):
    """
    TEST CASE 3: Request có token hết hạn
    - Tạo token với thời hạn âm (đã hết hạn trong quá khứ).
    - Expected: HTTP 401 Unauthorized.
    """
    expired_token = TokenService.issue(1, "ADMIN", expires_in_seconds=-60)
    headers = {"Authorization": f"Bearer {expired_token}"}

    res_profile = await client.get("/api/v1/profile", headers=headers)
    assert res_profile.status_code == 401
    assert res_profile.json()["errorCode"] == "UNAUTHORIZED"

    res_users = await client.get("/api/v1/users", headers=headers)
    assert res_users.status_code == 401
    assert res_users.json()["errorCode"] == "UNAUTHORIZED"


@pytest.mark.anyio
async def test_case_4_request_with_valid_token(client, viewer_headers, admin_headers):
    """
    TEST CASE 4: Request có token hợp lệ
    - Gửi request với token hợp lệ của các role tương ứng.
    - Expected: HTTP 200 OK và trả về đúng dữ liệu người dùng.
    """
    # Viewer lấy thông tin profile chính mình
    res_viewer = await client.get("/api/v1/profile", headers=viewer_headers)
    assert res_viewer.status_code == 200
    data_viewer = res_viewer.json()
    assert data_viewer["id"] == 4
    assert data_viewer["role"] == "VIEWER"

    # Admin lấy thông tin profile chính mình
    res_admin = await client.get("/api/v1/profile", headers=admin_headers)
    assert res_admin.status_code == 200
    data_admin = res_admin.json()
    assert data_admin["id"] == 1
    assert data_admin["role"] == "ADMIN"

    # Danh sách workflows với token hợp lệ
    res_wf = await client.get("/api/v1/workflows", headers=viewer_headers)
    assert res_wf.status_code == 200


@pytest.mark.anyio
async def test_case_5_viewer_accessing_admin_api(client, viewer_headers):
    """
    TEST CASE 5: Request của Viewer truy cập API Admin
    - Tài khoản VIEWER cố gắng truy cập các API dành riêng cho ADMIN.
    - Expected: HTTP 403 Forbidden.
    """
    # 1. GET /users
    res_list = await client.get("/api/v1/users", headers=viewer_headers)
    assert res_list.status_code == 403
    assert res_list.json()["errorCode"] == "FORBIDDEN"

    # 2. GET /users/{id}
    res_detail = await client.get("/api/v1/users/1", headers=viewer_headers)
    assert res_detail.status_code == 403
    assert res_detail.json()["errorCode"] == "FORBIDDEN"

    # 3. POST /users
    res_create = await client.post(
        "/api/v1/users",
        headers=viewer_headers,
        json={
            "username": "hacker",
            "email": "hacker@test.local",
            "password": "Password123!",
            "fullName": "Hacker User",
            "role": "ADMIN",
        },
    )
    assert res_create.status_code == 403
    assert res_create.json()["errorCode"] == "FORBIDDEN"

    # 4. PATCH /users/{id}/status
    res_status = await client.patch(
        "/api/v1/users/2/status",
        headers=viewer_headers,
        json={"isActive": False},
    )
    assert res_status.status_code == 403
    assert res_status.json()["errorCode"] == "FORBIDDEN"


@pytest.mark.anyio
async def test_case_6_admin_accessing_admin_api(client, admin_headers):
    """
    TEST CASE 6: Request của Admin truy cập API Admin
    - Tài khoản ADMIN truy cập các API quản trị người dùng.
    - Expected: HTTP 200 OK / 201 Created theo đúng nghiệp vụ.
    """
    # 1. Danh sách người dùng
    res_list = await client.get("/api/v1/users", headers=admin_headers)
    assert res_list.status_code == 200
    users = res_list.json()
    assert len(users) >= 4
    roles = [u["role"] for u in users]
    assert "ADMIN" in roles
    assert "VIEWER" in roles

    # 2. Chi tiết 1 người dùng
    res_detail = await client.get("/api/v1/users/1", headers=admin_headers)
    assert res_detail.status_code == 200
    assert res_detail.json()["id"] == 1


@pytest.mark.anyio
async def test_case_7_deactivated_user_access_denied(client):
    """
    TEST CASE 7: User bị vô hiệu hóa truy cập hệ thống
    - Người dùng có token hợp lệ nhưng trạng thái isActive=False.
    - Expected: HTTP 401 Unauthorized.
    """
    # Lấy tài khoản operator (id=2), vô hiệu hóa nó
    user2 = store.get_user_by_id(2)
    original_status = user2.isActive
    try:
        store.users[2] = user2.model_copy(update={"isActive": False})

        # Token cấp cho user 2 (vẫn đúng chữ ký, chưa hết hạn)
        token = TokenService.issue(2, "OPERATOR")
        headers = {"Authorization": f"Bearer {token}"}

        # Truy cập các API
        res_profile = await client.get("/api/v1/profile", headers=headers)
        assert res_profile.status_code == 401
        assert res_profile.json()["errorCode"] == "UNAUTHORIZED"

        res_wf = await client.get("/api/v1/workflows", headers=headers)
        assert res_wf.status_code == 401
        assert res_wf.json()["errorCode"] == "UNAUTHORIZED"
    finally:
        # Khôi phục trạng thái để không ảnh hưởng test khác
        store.users[2] = user2.model_copy(update={"isActive": original_status})


@pytest.mark.anyio
async def test_nonexistent_user_token_rejected(client):
    """
    Kiểm thử bổ sung: Token hợp lệ về mặt mã hóa nhưng UserId không tồn tại trong hệ thống.
    - Expected: HTTP 401 Unauthorized.
    """
    ghost_token = TokenService.issue(99999, "ADMIN")
    headers = {"Authorization": f"Bearer {ghost_token}"}
    res = await client.get("/api/v1/profile", headers=headers)
    assert res.status_code == 401
    assert res.json()["errorCode"] == "UNAUTHORIZED"


@pytest.mark.anyio
async def test_auth_login_and_logout_lifecycle(client):
    """
    Kiểm thử chu trình đăng nhập và đăng xuất:
    - Login thành công -> nhận Bearer token.
    - Dùng token gọi API cần auth -> thành công.
    - Logout kèm token -> 204 No Content.
    - Logout không kèm token -> 401 Unauthorized.
    """
    # 1. Login
    login_res = await client.post(
        "/api/v1/auth/login",
        json={"email": "admin@orchestrator.local", "password": "ChangeMe123!"},
    )
    assert login_res.status_code == 200
    token = login_res.json()["accessToken"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Dùng token truy cập API
    profile_res = await client.get("/api/v1/profile", headers=headers)
    assert profile_res.status_code == 200
    assert profile_res.json()["email"] == "admin@orchestrator.local"

    # 3. Logout với token
    logout_res = await client.post("/api/v1/auth/logout", headers=headers)
    assert logout_res.status_code == 204

    # 4. Logout không có token -> 401
    unauth_logout = await client.post("/api/v1/auth/logout")
    assert unauth_logout.status_code == 401
