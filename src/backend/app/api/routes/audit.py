from fastapi import APIRouter, Depends, Query
from app.core.dependencies import get_current_user
from app.domain.models import UserAccount
from app.persistence.store import store

router = APIRouter(prefix="/audit", tags=["Audit"])

@router.get("")
def list_audits(
    page: int = Query(1, ge=1),
    pageSize: int = Query(50, ge=1, le=100),
    user: UserAccount = Depends(get_current_user),
):
    all_logs = sorted(store.audits, key=lambda x: x.id, reverse=True)
    total = len(all_logs)
    start = (page - 1) * pageSize
    items = all_logs[start : start + pageSize]
    total_pages = (total + pageSize - 1) // pageSize if pageSize > 0 else 0
    return {
        "items": items,
        "page": page,
        "pageSize": pageSize,
        "totalItems": total,
        "totalPages": total_pages,
    }
