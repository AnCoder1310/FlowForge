from typing import Optional
from fastapi import APIRouter, Depends, Query
from app.core.dependencies import get_current_user
from app.domain.models import UserAccount
from app.persistence.store import store

router = APIRouter(tags=["Audit"])

@router.get("/audit")
@router.get("/audit-logs")
def list_audits(
    page: int = Query(1, ge=1),
    pageSize: int = Query(50, ge=1, le=100),
    action: Optional[str] = Query(None),
    dateFrom: Optional[str] = Query(None),
    dateTo: Optional[str] = Query(None),
    user: UserAccount = Depends(get_current_user),
):
    all_logs = sorted(store.audits, key=lambda x: x.id, reverse=True)
    if action:
        all_logs = [log for log in all_logs if log.action.upper() == action.upper()]
    if dateFrom:
        all_logs = [log for log in all_logs if log.changedAt[:10] >= dateFrom]
    if dateTo:
        all_logs = [log for log in all_logs if log.changedAt[:10] <= dateTo]

    total = len(all_logs)
    start = (page - 1) * pageSize
    items = all_logs[start : start + pageSize]
    total_pages = (total + pageSize - 1) // pageSize if pageSize > 0 else 0
    meta = {
        "page": page,
        "pageSize": pageSize,
        "totalItems": total,
        "totalPages": total_pages,
    }
    return {
        "items": items,
        "page": page,
        "pageSize": pageSize,
        "totalItems": total,
        "totalPages": total_pages,
        "meta": meta,
    }
