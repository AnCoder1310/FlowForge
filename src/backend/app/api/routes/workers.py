from typing import List
from fastapi import APIRouter, Depends, Response
from app.core.dependencies import get_current_user
from app.domain.models import RegisterWorkerRequest, UserAccount, WorkerNode
from app.services.worker_service import WorkerService

router = APIRouter(prefix="/workers", tags=["Workers"])

@router.post("/register", response_model=WorkerNode)
def register_worker(req: RegisterWorkerRequest):
    return WorkerService.register_worker(req)

@router.post("/{worker_id}/heartbeat", status_code=204)
def heartbeat(worker_id: str):
    WorkerService.record_heartbeat(worker_id)
    return Response(status_code=204)

@router.get("", response_model=List[WorkerNode])
def list_workers(user: UserAccount = Depends(get_current_user)):
    return WorkerService.list_workers()
