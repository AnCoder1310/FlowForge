from fastapi import APIRouter, Depends
from app.core.dependencies import get_current_user
from app.domain.models import (
    AiDiagnoseFailureRequest,
    AiDiagnoseFailureResponse,
    AiGenerateWorkflowRequest,
    AiGenerateWorkflowResponse,
    UserAccount,
)
from app.services.ai_service import AiOrchestratorService

router = APIRouter(prefix="/ai", tags=["AI Engine"])

@router.post("/generate-workflow", response_model=AiGenerateWorkflowResponse)
def generate_workflow_dag(
    req: AiGenerateWorkflowRequest,
    user: UserAccount = Depends(get_current_user),
):
    """Tự động thiết kế DAG workflow từ prompt văn bản tự nhiên sử dụng AI."""
    return AiOrchestratorService.generate_workflow(req.prompt)

@router.post("/diagnose-failure", response_model=AiDiagnoseFailureResponse)
def diagnose_execution_failure(
    req: AiDiagnoseFailureRequest,
    user: UserAccount = Depends(get_current_user),
):
    """Phân tích nguyên nhân gốc rễ và đề xuất giải pháp khi một task hoặc workflow bị lỗi (Self-healing)."""
    return AiOrchestratorService.diagnose_failure(req.instanceId, req.taskId)
