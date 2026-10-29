from fastapi import APIRouter, Depends
from app.core.dependencies import get_current_user
from app.domain.models import OrchestratorMetrics, UserAccount
from app.services.worker_service import WorkerService

router = APIRouter(prefix="/metrics", tags=["Metrics"])

@router.get("/dashboard", response_model=OrchestratorMetrics)
def get_dashboard_metrics(user: UserAccount = Depends(get_current_user)):
    return WorkerService.get_metrics()
