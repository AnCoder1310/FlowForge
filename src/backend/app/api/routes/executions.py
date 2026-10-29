from typing import Optional
from fastapi import APIRouter, Depends, Query, Response, status
from app.core.dependencies import get_current_user
from app.domain.models import TriggerWorkflowRequest, UserAccount, WorkflowInstance, WorkflowStatus
from app.services.execution_service import ExecutionService

router = APIRouter(prefix="/executions", tags=["Executions"])

@router.get("")
def list_executions(
    workflowId: Optional[int] = Query(None),
    status: Optional[WorkflowStatus] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    pageSize: int = Query(20, ge=1, le=100),
    user: UserAccount = Depends(get_current_user),
):
    return ExecutionService.list_executions(
        workflow_id=workflowId,
        status=status,
        search=search,
        page=page,
        page_size=pageSize,
    )

@router.get("/{instance_id}")
def get_execution_detail(
    instance_id: int,
    user: UserAccount = Depends(get_current_user),
):
    return ExecutionService.get_execution_detail(instance_id)

@router.post("/workflows/{workflow_id}/trigger", response_model=WorkflowInstance, status_code=status.HTTP_201_CREATED)
def trigger_workflow(
    workflow_id: int,
    req: TriggerWorkflowRequest,
    user: UserAccount = Depends(get_current_user),
):
    return ExecutionService.trigger_workflow(workflow_id, req, user)

@router.post("/{instance_id}/cancel", status_code=status.HTTP_204_NO_CONTENT)
def cancel_execution(
    instance_id: int,
    user: UserAccount = Depends(get_current_user),
):
    ExecutionService.cancel_execution(instance_id, user)
    return Response(status_code=204)
