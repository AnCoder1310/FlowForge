from typing import Optional
from fastapi import APIRouter, Depends, Query, Response, status
from app.core.dependencies import get_current_user
from app.domain.models import CreateWorkflowRequest, UpdateWorkflowRequest, UserAccount, WorkflowDefinition
from app.services.workflow_service import WorkflowService

router = APIRouter(prefix="/workflows", tags=["Workflows"])

@router.get("")
def list_workflows(
    search: Optional[str] = Query(None),
    isActive: Optional[bool] = Query(None),
    page: int = Query(1, ge=1),
    pageSize: int = Query(20, ge=1, le=100),
    user: UserAccount = Depends(get_current_user),
):
    return WorkflowService.list_workflows(search=search, is_active=isActive, page=page, page_size=pageSize)

@router.get("/{workflow_id}", response_model=WorkflowDefinition)
def get_workflow(
    workflow_id: int,
    user: UserAccount = Depends(get_current_user),
):
    return WorkflowService.get_workflow(workflow_id)

@router.post("", response_model=WorkflowDefinition, status_code=status.HTTP_201_CREATED)
def create_workflow(
    req: CreateWorkflowRequest,
    user: UserAccount = Depends(get_current_user),
):
    return WorkflowService.create_workflow(req, user)

@router.put("/{workflow_id}", response_model=WorkflowDefinition)
def update_workflow(
    workflow_id: int,
    req: UpdateWorkflowRequest,
    user: UserAccount = Depends(get_current_user),
):
    return WorkflowService.update_workflow(workflow_id, req, user)

@router.delete("/{workflow_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_workflow(
    workflow_id: int,
    user: UserAccount = Depends(get_current_user),
):
    WorkflowService.delete_workflow(workflow_id, user)
    return Response(status_code=204)
