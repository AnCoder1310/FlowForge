from datetime import datetime, timezone
import pytest
from app.domain.models import StepStatus, TaskExecution, TaskType, WorkflowInstance, WorkflowStatus
from app.persistence.store import store
from app.services.ai_service import AiOrchestratorService

def test_ai_generate_workflow_feedback():
    resp = AiOrchestratorService.generate_workflow("Tự động phân tích đánh giá review của khách hàng")
    assert resp.name == "AI-Customer-Feedback-Analyzer"
    assert len(resp.dag.steps) == 5
    step_types = [s.type for s in resp.dag.steps]
    assert TaskType.AI_AGENT_TASK in step_types
    assert "Đã thiết kế quy trình Agentic DAG" in resp.reasoning

def test_ai_generate_workflow_etl():
    resp = AiOrchestratorService.generate_workflow("Tạo pipeline ETL xử lý dữ liệu lớn")
    assert "Data" in resp.name
    assert len(resp.dag.steps) >= 4
    assert any(s.type == TaskType.AI_AGENT_TASK for s in resp.dag.steps)

def test_ai_diagnose_failure_timeout():
    now = datetime.now(timezone.utc)
    inst = store.add_instance(WorkflowInstance(
        id=0,
        workflowId=1,
        workflowName="Test-Flow",
        version=1,
        status=WorkflowStatus.FAILED,
        inputPayloadJson="{}",
        contextDataJson="{}",
        errorMessage="HTTP connection timed out while querying third-party service",
        createdAt=now,
        updatedAt=now,
    ))
    resp = AiOrchestratorService.diagnose_failure(inst.id, None)
    assert resp.severity in ["LOW", "MEDIUM", "HIGH"]
    assert len(resp.suggestedFix) > 0
    assert "timeout" in resp.rootCause.lower() or "timeout" in resp.suggestedFix.lower()

@pytest.mark.anyio
async def test_ai_generate_workflow_api(client, admin_headers):
    res = await client.post(
        "/api/v1/ai/generate-workflow",
        headers=admin_headers,
        json={"prompt": "Xây dựng pipeline AI phân loại văn bản"}
    )
    assert res.status_code == 200
    data = res.json()
    assert "dag" in data
    assert len(data["dag"]["steps"]) > 0
