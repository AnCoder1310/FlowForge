from datetime import datetime, timezone
from typing import List
from fastapi import APIRouter, Depends, status
from pydantic import BaseModel
from app.core.dependencies import require_roles
from app.core.exceptions import AppException
from app.core.security import PasswordService
from app.domain.models import CreateUserRequest, SafeUser, UpdateUserRequest, UserAccount, UserRole
from app.persistence.store import store

router = APIRouter(prefix="/users", tags=["User Management"])

class StatusRequest(BaseModel):
    isActive: bool

def _to_safe(u: UserAccount) -> SafeUser:
    return SafeUser(
        id=u.id,
        username=u.username,
        email=u.email,
        fullName=u.fullName,
        phone=u.phone,
        timezone=u.timezone,
        role=u.role,
        isActive=u.isActive,
        avatarUrl=u.avatarUrl,
        lastLoginAt=u.lastLoginAt,
        createdAt=u.createdAt,
        updatedAt=u.updatedAt,
    )

@router.get("", response_model=List[SafeUser])
def list_users(admin: UserAccount = Depends(require_roles(UserRole.ADMIN))):
    return [_to_safe(u) for u in store.users.values()]

@router.get("/{user_id}", response_model=SafeUser)
def get_user(user_id: int, admin: UserAccount = Depends(require_roles(UserRole.ADMIN))):
    u = store.get_user_by_id(user_id)
    if not u:
        raise AppException.not_found(f"User #{user_id}")
    return _to_safe(u)

@router.post("", response_model=SafeUser, status_code=status.HTTP_201_CREATED)
def create_user(req: CreateUserRequest, admin: UserAccount = Depends(require_roles(UserRole.ADMIN))):
    if store.find_user_by_email(req.email):
        raise AppException.conflict(f"Email '{req.email}' is already registered.")

    now = datetime.now(timezone.utc)
    store._user_seq += 1
    new_user = UserAccount(
        id=store._user_seq,
        username=req.username.strip(),
        email=req.email.strip().lower(),
        passwordHash=PasswordService.hash_password(req.password),
        fullName=req.fullName.strip(),
        phone=req.phone,
        timezone=req.timezone or "Asia/Ho_Chi_Minh",
        role=req.role,
        isActive=req.isActive,
        avatarUrl=req.avatarUrl,
        createdAt=now,
        updatedAt=now,
    )
    store.users[new_user.id] = new_user
    store.record_audit("CREATE", "USER", f"Created user {new_user.email} ({new_user.role.value})", admin.id)
    return _to_safe(new_user)

@router.put("/{user_id}", response_model=SafeUser)
def update_user(user_id: int, req: UpdateUserRequest, admin: UserAccount = Depends(require_roles(UserRole.ADMIN))):
    u = store.get_user_by_id(user_id)
    if not u:
        raise AppException.not_found(f"User #{user_id}")

    now = datetime.now(timezone.utc)
    updated = u.model_copy(update={
        "username": req.username.strip(),
        "email": req.email.strip().lower(),
        "fullName": req.fullName.strip(),
        "phone": req.phone,
        "timezone": req.timezone or u.timezone,
        "role": req.role,
        "isActive": req.isActive,
        "avatarUrl": req.avatarUrl if req.avatarUrl is not None else u.avatarUrl,
        "updatedAt": now,
    })
    store.users[u.id] = updated
    store.record_audit("UPDATE", "USER", f"Updated user {updated.email} (#{user_id})", admin.id)
    return _to_safe(updated)

@router.patch("/{user_id}/status", response_model=SafeUser)
def update_user_status(user_id: int, req: StatusRequest, admin: UserAccount = Depends(require_roles(UserRole.ADMIN))):
    u = store.get_user_by_id(user_id)
    if not u:
        raise AppException.not_found(f"User #{user_id}")

    now = datetime.now(timezone.utc)
    updated = u.model_copy(update={"isActive": req.isActive, "updatedAt": now})
    store.users[u.id] = updated
    verb = "Activated" if req.isActive else "Deactivated"
    store.record_audit("UPDATE", "USER", f"{verb} user {updated.email} (#{user_id})", admin.id)
    return _to_safe(updated)
