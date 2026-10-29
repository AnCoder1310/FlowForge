from datetime import datetime, timezone
from fastapi import APIRouter, Depends, Response
from app.core.dependencies import get_current_user
from app.core.exceptions import AppException
from app.core.security import PasswordService, TokenService
from app.domain.models import LoginRequest, LoginResult, SafeUser, UserAccount
from app.persistence.store import store

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/login", response_model=LoginResult)
def login(req: LoginRequest):
    user = store.find_user_by_email(req.email)
    if not user or not PasswordService.verify_password(user.passwordHash, req.password):
        raise AppException.unauthorized("Email hoặc mật khẩu không chính xác.")

    if not user.isActive:
        raise AppException.unauthorized("Tài khoản đã bị vô hiệu hóa.")

    now = datetime.now(timezone.utc)
    user.lastLoginAt = now
    token = TokenService.issue(user.id, user.role.value)

    store.record_audit("LOGIN", "AUTH", f"User {user.email} signed in", user.id)

    safe_user = SafeUser(
        id=user.id,
        username=user.username,
        email=user.email,
        fullName=user.fullName,
        phone=user.phone,
        timezone=user.timezone,
        role=user.role,
        isActive=user.isActive,
        avatarUrl=user.avatarUrl,
        lastLoginAt=user.lastLoginAt,
        createdAt=user.createdAt,
        updatedAt=user.updatedAt,
    )

    return LoginResult(
        accessToken=token,
        tokenType="Bearer",
        expiresAt=now,
        user=safe_user,
    )

@router.post("/logout", status_code=204)
def logout(user: UserAccount = Depends(get_current_user)):
    store.record_audit("LOGOUT", "AUTH", f"User {user.email} signed out", user.id)
    return Response(status_code=204)
