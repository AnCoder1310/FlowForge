from fastapi import APIRouter
from app.domain.models import CompleteTaskRequest, FailTaskRequest, PollTaskRequest, PollTaskResponse, TaskExecution
from app.services.execution_service import ExecutionService
from app.services.worker_service import WorkerService

router = APIRouter(prefix="/tasks", tags=["Tasks"])

@router.post("/poll", response_model=PollTaskResponse)
def poll_task(req: PollTaskRequest):
    return WorkerService.poll_task(req)

@router.post("/{task_id}/complete", response_model=TaskExecution)
def complete_task(task_id: int, req: CompleteTaskRequest):
    return ExecutionService.complete_task(task_id, req)

@router.post("/{task_id}/fail", response_model=TaskExecution)
def fail_task(task_id: int, req: FailTaskRequest):
    return ExecutionService.fail_task(task_id, req)
