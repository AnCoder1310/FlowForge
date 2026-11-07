from typing import List, Optional
from fastapi import Depends, Header
from app.core.exceptions import AppException
from app.core.security import TokenService
from app.domain.models import UserAccount, UserRole
from app.persistence.store import store


def get_current_user(authorization: Optional[str] = Header(None)) -> UserAccount:
    if not authorization:
        raise AppException.unauthorized("Missing Authorization header.")

    parts = authorization.split(" ", 1)
    if len(parts) != 2 or parts[0].lower() != "bearer" or not parts[1].strip():
        raise AppException.unauthorized("Missing or invalid Authorization header format. Expected 'Bearer <token>'.")

    token = parts[1].strip()

    data = TokenService.validate(token)
    if not data:
        raise AppException.unauthorized("Invalid or expired bearer token.")

    user_id = data.get("UserId")
    if user_id is None:
        raise AppException.unauthorized("Invalid token payload.")

    user = store.get_user_by_id(user_id)
    if not user:
        raise AppException.unauthorized("User account is inactive or not found.")

    if not user.isActive:
        raise AppException.unauthorized("User account is inactive or disabled.")

    return user


def require_roles(*allowed_roles: UserRole):
    def role_checker(user: UserAccount = Depends(get_current_user)) -> UserAccount:
        if user.role not in allowed_roles:
            raise AppException.forbidden(f"Action requires one of roles: {[r.value for r in allowed_roles]}")
        return user

    return role_checker
