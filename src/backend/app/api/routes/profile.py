from datetime import datetime, timezone
from fastapi import APIRouter, Depends, Response
from app.core.dependencies import get_current_user
from app.core.exceptions import AppException
from app.core.security import PasswordService
from app.domain.models import ChangePasswordRequest, SafeUser, UpdateProfileRequest, UserAccount
from app.persistence.store import store

router = APIRouter(prefix="/profile", tags=["Profile"])

@router.get("", response_model=SafeUser)
def get_profile(user: UserAccount = Depends(get_current_user)):
    return SafeUser(
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

@router.put("", response_model=SafeUser)
def update_profile(req: UpdateProfileRequest, user: UserAccount = Depends(get_current_user)):
    now = datetime.now(timezone.utc)
    updated = user.model_copy(update={
        "fullName": req.fullName.strip(),
        "phone": req.phone,
        "timezone": req.timezone or user.timezone,
        "avatarUrl": req.avatarUrl if req.avatarUrl is not None else user.avatarUrl,
        "updatedAt": now,
    })
    store.users[user.id] = updated
    store.record_audit("UPDATE", "PROFILE", "Updated own profile", user.id)
    return SafeUser(
        id=updated.id,
        username=updated.username,
        email=updated.email,
        fullName=updated.fullName,
        phone=updated.phone,
        timezone=updated.timezone,
        role=updated.role,
        isActive=updated.isActive,
        avatarUrl=updated.avatarUrl,
        lastLoginAt=updated.lastLoginAt,
        createdAt=updated.createdAt,
        updatedAt=updated.updatedAt,
    )

@router.put("/password", status_code=204)
def change_password(req: ChangePasswordRequest, user: UserAccount = Depends(get_current_user)):
    if not PasswordService.verify_password(user.passwordHash, req.currentPassword):
        raise AppException.validation("Mật khẩu hiện tại không đúng.")

    if len(req.newPassword) < 6:
        raise AppException.validation("Mật khẩu mới phải có ít nhất 6 ký tự.")

    now = datetime.now(timezone.utc)
    updated = user.model_copy(update={
        "passwordHash": PasswordService.hash_password(req.newPassword),
        "updatedAt": now,
    })
    store.users[user.id] = updated
    store.record_audit("UPDATE", "PROFILE", "Changed own password", user.id)
    return Response(status_code=204)
