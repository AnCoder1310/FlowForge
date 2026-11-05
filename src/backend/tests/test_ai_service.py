import json
from datetime import datetime, timezone
import pytest
import httpx

from app.core.exceptions import AppException
from app.domain.models import (
    StepStatus,
    TaskExecution,
    TaskType,
    WorkflowInstance,
    WorkflowStatus,
)
from app.persistence.store import store
from app.services.ai_service import AiOrchestratorService


SAMPLE_LLM_DAG = {
    "name": "E-Commerce-Fulfillment-Flow",
    "description": "Multi-step order fulfillment with parallel payments and inventory check",
    "reasoning": "Tasks run in parallel then merge at packaging.",
    "dag": {
        "steps": [
            {
                "id": "receive-order",
                "name": "Receive Order",
                "type": "HTTP_TASK",
                "queue": "default",
                "dependsOn": [],
                "maxRetries": 2,
                "timeoutSeconds": 30,
            },
            {
                "id": "validate-order",
                "name": "Validate Order",
                "type": "WORKER_TASK",
                "queue": "compute",
                "dependsOn": ["receive-order"],
                "maxRetries": 3,
                "timeoutSeconds": 60,
            },
            {
                "id": "check-payment",
                "name": "Check Payment",
                "type": "WORKER_TASK",
                "queue": "payment",
                "dependsOn": ["validate-order"],
                "maxRetries": 2,
                "timeoutSeconds": 45,
            },
            {
                "id": "check-inventory",
                "name": "Check Inventory",
                "type": "WORKER_TASK",
                "queue": "data-io",
                "dependsOn": ["validate-order"],
                "maxRetries": 3,
                "timeoutSeconds": 45,
            },
            {
                "id": "prepare-order",
                "name": "Prepare Order",
                "type": "WORKER_TASK",
                "queue": "compute",
                "dependsOn": ["check-payment", "check-inventory"],
                "maxRetries": 2,
                "timeoutSeconds": 120,
            },
            {
                "id": "notify-customer",
                "name": "Notify Customer",
                "type": "NOTIFICATION",
                "queue": "notification",
                "dependsOn": ["prepare-order"],
                "maxRetries": 1,
                "timeoutSeconds": 30,
            },
        ]
    },
}


def test_ai_generate_workflow_with_mocked_llm(monkeypatch):
    monkeypatch.setattr(
        AiOrchestratorService,
        "_call_llm",
        lambda sys_prompt, usr_prompt, model=None: SAMPLE_LLM_DAG,
    )

    resp = AiOrchestratorService.generate_workflow(
        "Xử lý đơn hàng thương mại điện tử, thanh toán và tồn kho song song, giao hàng"
    )
    assert resp.name == "E-Commerce-Fulfillment-Flow"
    steps = resp.dag.steps
    assert len(steps) == 6

    # Root input step
    root_steps = [s for s in steps if not s.dependsOn]
    assert len(root_steps) == 1
    assert root_steps[0].id == "receive-order"

    # Parallel branches
    pay_step = next(s for s in steps if s.id == "check-payment")
    inv_step = next(s for s in steps if s.id == "check-inventory")
    assert pay_step.dependsOn == ["validate-order"]
    assert inv_step.dependsOn == ["validate-order"]

    # Fan-in join
    prep_step = next(s for s in steps if s.id == "prepare-order")
    assert set(prep_step.dependsOn) == {"check-payment", "check-inventory"}


def test_ai_generate_workflow_auto_save(monkeypatch):
    monkeypatch.setattr(
        AiOrchestratorService,
        "_call_llm",
        lambda sys_prompt, usr_prompt, model=None: SAMPLE_LLM_DAG,
    )

    resp = AiOrchestratorService.generate_workflow(
        "Tự động lưu quy trình xử lý đơn hàng",
        auto_save=True,
        actor_user_id=1,
    )
    assert resp.workflowId is not None
    saved_wf = store.get_workflow(resp.workflowId)
    assert saved_wf is not None
    assert saved_wf.name == "E-Commerce-Fulfillment-Flow"
    assert len(saved_wf.dag.steps) == 6


def test_ai_generate_workflow_empty_prompt():
    with pytest.raises(AppException) as exc_info:
        AiOrchestratorService.generate_workflow("")
    assert exc_info.value.status_code == 400
    assert "cung cấp mô tả" in exc_info.value.detail_message


def test_ai_generate_workflow_provider_unreachable(monkeypatch):
    def mock_call(sys_prompt, usr_prompt, model=None):
        raise AppException.service_unavailable(
            "Không thể kết nối đến AI Gateway tại 'http://localhost:20128/v1'."
        )

    monkeypatch.setattr(AiOrchestratorService, "_call_llm", mock_call)

    with pytest.raises(AppException) as exc_info:
        AiOrchestratorService.generate_workflow("Tạo pipeline dữ liệu")
    assert exc_info.value.status_code == 503
    assert "Không thể kết nối" in exc_info.value.detail_message


def test_ai_generate_workflow_timeout(monkeypatch):
    def mock_call(sys_prompt, usr_prompt, model=None):
        raise AppException.gateway_timeout("AI Provider phản hồi vượt quá thời gian chờ (30.0s).")

    monkeypatch.setattr(AiOrchestratorService, "_call_llm", mock_call)

    with pytest.raises(AppException) as exc_info:
        AiOrchestratorService.generate_workflow("Tạo pipeline dữ liệu")
    assert exc_info.value.status_code == 504
    assert "thời gian chờ" in exc_info.value.detail_message


def test_ai_json_parsing_and_markdown_stripping():
    # Markdown fenced json with trailing comma
    raw_markdown = """```json
    {
      "name": "Pipeline-Test",
      "description": "Test description",
      "reasoning": "Test reasoning",
      "dag": {
        "steps": [
          {
            "id": "step-1",
            "name": "Fetch",
            "type": "HTTP_TASK",
            "queue": "default",
            "dependsOn": [],
            "maxRetries": 2,
            "timeoutSeconds": 30,
          },
        ]
      }
    }
    ```"""
    parsed = AiOrchestratorService._parse_llm_json(raw_markdown)
    assert parsed["name"] == "Pipeline-Test"
    assert len(parsed["dag"]["steps"]) == 1

    # Invalid JSON
    with pytest.raises(AppException) as exc_info:
        AiOrchestratorService._parse_llm_json("This is not JSON at all")
    assert exc_info.value.status_code == 400


def test_ai_sanitize_and_repair_dag_cycles_and_corrupt_data():
    raw_corrupt = {
        "name": "Corrupt-DAG-Test",
        "description": "DAG with duplicates, unknown queues, and circular dependencies",
        "reasoning": "Self-healing test",
        "dag": {
            "steps": [
                {
                    "id": "step-a",
                    "name": "Step A",
                    "type": "UNKNOWN_CUSTOM_TYPE",
                    "queue": "unsupported_queue",
                    "dependsOn": ["step-b"],  # Cycle: A depends on B, B depends on A
                    "maxRetries": 999,
                    "timeoutSeconds": 9999,
                },
                {
                    "id": "step-b",
                    "name": "Step B",
                    "type": "AI_AGENT_TASK",
                    "queue": "ai-agent",
                    "dependsOn": ["step-a"],  # Cycle!
                    "maxRetries": -5,
                    "timeoutSeconds": 0,
                },
                {
                    "id": "step-a",  # Duplicate ID
                    "name": "Step A Duplicate",
                    "type": "NOTIFICATION",
                    "queue": "notification",
                    "dependsOn": ["non-existent-step", "step-a"],  # Non-existent and self
                    "maxRetries": 2,
                    "timeoutSeconds": 30,
                },
            ]
        },
    }

    repaired = AiOrchestratorService._sanitize_and_repair_dag(raw_corrupt, "Test prompt")
    steps = repaired.dag.steps
    assert len(steps) == 3

    # 1. Unique IDs
    step_ids = [s.id for s in steps]
    assert len(step_ids) == len(set(step_ids))

    # 2. No self dependency
    for s in steps:
        assert s.id not in s.dependsOn

    # 3. Normalized types and queues
    for s in steps:
        assert s.type in [
            TaskType.WORKER_TASK,
            TaskType.HTTP_TASK,
            TaskType.AI_AGENT_TASK,
            TaskType.NOTIFICATION,
        ]
        assert 1 <= s.maxRetries <= 5
        assert 15 <= s.timeoutSeconds <= 600

    # 4. Kahn's algorithm cycle resolution: graph must be acyclic
    from app.domain.dag_engine import DagEngine
    # If validate_dag does not raise an exception, the cycle was cleanly broken
    DagEngine.validate_dag(repaired.dag)


def test_ai_diagnose_failure_heuristic_fallback():
    now = datetime.now(timezone.utc)
    inst = store.add_instance(
        WorkflowInstance(
            id=0,
            workflowId=1,
            workflowName="Test-Failure-Flow",
            version=1,
            status=WorkflowStatus.FAILED,
            inputPayloadJson="{}",
            contextDataJson="{}",
            errorMessage="HTTP connection timed out while querying third-party service",
            createdAt=now,
            updatedAt=now,
        )
    )

    # When LLM is not responding, falls back to heuristic diagnostics
    resp = AiOrchestratorService.diagnose_failure(inst.id, None)
    assert resp.severity in ["LOW", "MEDIUM", "HIGH"]
    assert len(resp.suggestedFix) > 0
    assert "timeout" in resp.rootCause.lower() or "timeout" in resp.suggestedFix.lower()


def test_ai_diagnose_failure_with_mocked_llm(monkeypatch):
    mock_diag = {
        "rootCause": "Payment gateway rejected API token due to expired credentials.",
        "suggestedFix": "1. Rotate Stripe Secret Key in Vault.\n2. Re-trigger task execution.",
        "severity": "CRITICAL",
        "autoFixable": False,
    }
    monkeypatch.setattr(
        AiOrchestratorService,
        "_call_llm",
        lambda sys_prompt, usr_prompt, model=None: mock_diag,
    )

    now = datetime.now(timezone.utc)
    inst = store.add_instance(
        WorkflowInstance(
            id=0,
            workflowId=1,
            workflowName="Payment-Processing-Flow",
            version=1,
            status=WorkflowStatus.FAILED,
            inputPayloadJson="{}",
            contextDataJson="{}",
            errorMessage="Unauthorized: Invalid API key",
            createdAt=now,
            updatedAt=now,
        )
    )

    resp = AiOrchestratorService.diagnose_failure(inst.id, None)
    assert resp.severity == "CRITICAL"
    assert "Stripe" in resp.suggestedFix or "credentials" in resp.rootCause
    assert resp.autoFixable is False


@pytest.mark.anyio
async def test_ai_generate_workflow_api(client, admin_headers, monkeypatch):
    monkeypatch.setattr(
        AiOrchestratorService,
        "_call_llm",
        lambda sys_prompt, usr_prompt, model=None: SAMPLE_LLM_DAG,
    )

    res = await client.post(
        "/api/v1/ai/generate-workflow",
        headers=admin_headers,
        json={"prompt": "Xây dựng pipeline AI phân loại văn bản"},
    )
    assert res.status_code == 200
    data = res.json()
    assert "dag" in data
    assert len(data["dag"]["steps"]) == 6
    assert data["name"] == "E-Commerce-Fulfillment-Flow"
