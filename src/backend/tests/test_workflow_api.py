import pytest
from datetime import datetime, timezone
from app.domain.models import (
    DagDefinition,
    DagStep,
    FailTaskRequest,
    WorkflowDefinition,
    WorkflowStatus,
)
from app.domain.dag_validation import KahnScheduler
from app.persistence.database import get_db_connection
from app.persistence.store import store

@pytest.mark.anyio
async def test_health_check(client):
    res = await client.get("/health")
    assert res.status_code == 200
    assert res.json()["status"] == "healthy"

@pytest.mark.anyio
async def test_login_success(client):
    res = await client.post("/api/v1/auth/login", json={"email": "admin@orchestrator.local", "password": "ChangeMe123!"})
    assert res.status_code == 200
    data = res.json()
    assert "accessToken" in data
    assert data["user"]["role"] == "ADMIN"

@pytest.mark.anyio
async def test_login_failure(client):
    res = await client.post("/api/v1/auth/login", json={"email": "admin@orchestrator.local", "password": "WrongPassword"})
    assert res.status_code == 401

@pytest.mark.anyio
async def test_list_workflows(client, admin_headers):
    res = await client.get("/api/v1/workflows?pageSize=100", headers=admin_headers)
    assert res.status_code == 200
    data = res.json()
    assert "items" in data
    assert data["totalItems"] >= 2
    names = [w["name"] for w in data["items"]]
    assert "Data-ETL-Pipeline" in names

@pytest.mark.anyio
async def test_trigger_workflow_creates_instance_and_scheduled_tasks(client, admin_headers):
    res = await client.post(
        "/api/v1/executions/workflows/1/trigger",
        headers=admin_headers,
        json={"inputPayloadJson": "{\"batchId\":\"test-01\"}"}
    )
    assert res.status_code == 201
    instance = res.json()
    assert instance["status"] == "RUNNING"
    assert len(instance["tasks"]) > 0
    # Root task should be SCHEDULED
    root_task = instance["tasks"][0]
    assert root_task["status"] == "SCHEDULED"
    assert root_task["stepId"] == "step-extract"


@pytest.mark.anyio
async def test_valid_four_step_dag_runs_through_api_and_worker_queue(client, admin_headers):
    workflow_response = await client.post(
        "/api/v1/workflows",
        headers=admin_headers,
        json={
            "name": "Final-Regression-Valid-DAG",
            "dag": {"steps": [
                {"id": "receive", "name": "Receive", "queue": "default", "dependsOn": []},
                {"id": "validate", "name": "Validate", "queue": "default", "dependsOn": ["receive"]},
                {"id": "process", "name": "Process", "queue": "default", "dependsOn": ["validate"]},
                {"id": "complete", "name": "Complete", "queue": "default", "dependsOn": ["process"]},
            ]},
        },
    )
    assert workflow_response.status_code == 201
    workflow = workflow_response.json()
    analysis = KahnScheduler.analyze(DagDefinition.model_validate(workflow["dag"]))
    assert analysis.processed_count == 4
    assert analysis.execution_plan == [
        ["receive"], ["validate"], ["process"], ["complete"],
    ]

    trigger_response = await client.post(
        f"/api/v1/executions/workflows/{workflow['id']}/trigger",
        headers=admin_headers,
        json={"inputPayloadJson": "{}"},
    )
    assert trigger_response.status_code == 201
    instance = trigger_response.json()
    assert instance["status"] == "RUNNING"
    assert [task["status"] for task in instance["tasks"]] == [
        "SCHEDULED", "PENDING", "PENDING", "PENDING",
    ]

    completed_steps = []
    for _ in range(4):
        poll_response = await client.post(
            "/api/v1/tasks/poll",
            json={"workerId": "worker-default-01", "queues": ["default"]},
        )
        assert poll_response.status_code == 200
        task = poll_response.json()["task"]
        assert task is not None
        complete_response = await client.post(
            f"/api/v1/tasks/{task['id']}/complete",
            json={"outputPayloadJson": "{}"},
        )
        assert complete_response.status_code == 200
        completed_steps.append(task["stepId"])

    assert completed_steps == ["receive", "validate", "process", "complete"]
    detail = await client.get(
        f"/api/v1/executions/{instance['id']}",
        headers=admin_headers,
    )
    assert detail.status_code == 200
    assert detail.json()["instance"]["status"] == "COMPLETED"
    assert all(task["status"] == "COMPLETED" for task in detail.json()["tasks"])

    final_poll = await client.post(
        "/api/v1/tasks/poll",
        json={"workerId": "worker-default-01", "queues": ["default"]},
    )
    assert final_poll.status_code == 200
    assert final_poll.json()["task"] is None


@pytest.mark.anyio
async def test_worker_does_not_claim_scheduled_task_for_terminal_instance(client, admin_headers):
    trigger_response = await client.post(
        "/api/v1/executions/workflows/1/trigger",
        headers=admin_headers,
        json={"inputPayloadJson": "{}"},
    )
    assert trigger_response.status_code == 201
    instance = trigger_response.json()
    assert any(task["status"] == "SCHEDULED" for task in instance["tasks"])

    failed_instance = store.get_instance(instance["id"]).model_copy(
        update={"status": WorkflowStatus.FAILED}
    )
    store.update_instance(failed_instance)

    poll_response = await client.post(
        "/api/v1/tasks/poll",
        json={"workerId": "worker-default-01", "queues": ["data-io"]},
    )

    assert poll_response.status_code == 200
    assert poll_response.json()["task"] is None


@pytest.mark.anyio
async def test_database_claim_guard_requires_running_instance(client, admin_headers):
    trigger_response = await client.post(
        "/api/v1/executions/workflows/1/trigger",
        headers=admin_headers,
        json={"inputPayloadJson": "{}"},
    )
    assert trigger_response.status_code == 201
    instance = trigger_response.json()

    conn = get_db_connection()
    conn.execute(
        "UPDATE workflow_instances SET status = 'FAILED' WHERE id = ?",
        (instance["id"],),
    )
    conn.commit()
    conn.close()
    assert store.get_instance(instance["id"]).status == WorkflowStatus.RUNNING

    poll_response = await client.post(
        "/api/v1/tasks/poll",
        json={"workerId": "worker-default-01", "queues": ["data-io"]},
    )

    assert poll_response.status_code == 200
    assert poll_response.json()["task"] is None


@pytest.mark.anyio
async def test_worker_failure_retries_then_fails_instance_after_retry_limit(client, admin_headers):
    workflow_response = await client.post(
        "/api/v1/workflows",
        headers=admin_headers,
        json={
            "name": "Final-Regression-Retry-Workflow",
            "dag": {"steps": [
                {
                    "id": "retry-task",
                    "name": "Retry Task",
                    "queue": "default",
                    "dependsOn": [],
                    "maxRetries": 1,
                },
            ]},
        },
    )
    assert workflow_response.status_code == 201
    workflow_id = workflow_response.json()["id"]
    trigger_response = await client.post(
        f"/api/v1/executions/workflows/{workflow_id}/trigger",
        headers=admin_headers,
        json={"inputPayloadJson": "{}"},
    )
    assert trigger_response.status_code == 201
    instance_id = trigger_response.json()["id"]

    first_poll = await client.post(
        "/api/v1/tasks/poll",
        json={"workerId": "worker-default-01", "queues": ["default"]},
    )
    assert first_poll.status_code == 200
    task = first_poll.json()["task"]
    assert task is not None
    assert task["status"] == "RUNNING"
    task_id = task["id"]

    first_failure = await client.post(
        f"/api/v1/tasks/{task_id}/fail",
        json={"errorMessage": "Transient worker failure", "canRetry": True},
    )
    assert first_failure.status_code == 200
    assert first_failure.json()["status"] == "SCHEDULED"
    assert first_failure.json()["retryCount"] == 1
    assert store.get_instance(instance_id).status == WorkflowStatus.RUNNING

    retry_poll = await client.post(
        "/api/v1/tasks/poll",
        json={"workerId": "worker-default-01", "queues": ["default"]},
    )
    assert retry_poll.status_code == 200
    assert retry_poll.json()["task"]["id"] == task_id
    assert retry_poll.json()["task"]["status"] == "RUNNING"

    final_failure = await client.post(
        f"/api/v1/tasks/{task_id}/fail",
        json={"errorMessage": "Retry limit exhausted", "canRetry": True},
    )
    assert final_failure.status_code == 200
    assert final_failure.json()["status"] == "FAILED"
    assert store.get_instance(instance_id).status == WorkflowStatus.FAILED

    no_more_tasks = await client.post(
        "/api/v1/tasks/poll",
        json={"workerId": "worker-default-01", "queues": ["default"]},
    )
    assert no_more_tasks.status_code == 200
    assert no_more_tasks.json()["task"] is None


@pytest.mark.anyio
async def test_cyclic_workflow_is_rejected_before_instance_or_task_enqueue(client, admin_headers):
    now = datetime.now(timezone.utc)
    workflow = store.add_workflow(WorkflowDefinition(
        id=0,
        name="Fraud-Approval-Cycle",
        version=1,
        dag=DagDefinition(steps=[
            DagStep(id="fraud-detection", name="Fraud Detection", dependsOn=["transaction-approval"]),
            DagStep(id="transaction-approval", name="Transaction Approval", dependsOn=["fraud-detection"]),
        ]),
        isActive=True,
        createdBy=1,
        createdAt=now,
        updatedAt=now,
    ))

    response = await client.post(
        f"/api/v1/executions/workflows/{workflow.id}/trigger",
        headers=admin_headers,
        json={"inputPayloadJson": "{}"},
    )

    assert response.status_code == 400
    body = response.json()
    assert body["errorCode"] == "CIRCULAR_DEPENDENCY"
    assert body["cycleNodes"] == ["fraud-detection", "transaction-approval"]
    assert body["blockedNodes"] == []
    assert body["processedCount"] == 0
    assert body["totalNodes"] == 2
    assert "không thể được thực thi" in body["detail"]
    assert store.list_instances(workflow_id=workflow.id) == []
    assert store.tasks == {}
    assert store.poll_scheduled_task("worker-default-01", ["default"]) is None


@pytest.mark.anyio
async def test_receive_validate_then_cycle_returns_structured_kahn_progress(client, admin_headers):
    workflow = store.add_workflow(WorkflowDefinition(
        id=0,
        name="Receive-Validate-Cycle",
        version=1,
        dag=DagDefinition(steps=[
            DagStep(id="receive", name="Receive", dependsOn=[]),
            DagStep(id="validate", name="Validate", dependsOn=["receive"]),
            DagStep(id="fraud-detection", name="Fraud Detection", dependsOn=["transaction-approval"]),
            DagStep(id="transaction-approval", name="Transaction Approval", dependsOn=["fraud-detection"]),
        ]),
        isActive=True,
        createdBy=1,
        createdAt=datetime.now(timezone.utc),
        updatedAt=datetime.now(timezone.utc),
    ))

    response = await client.post(
        f"/api/v1/executions/workflows/{workflow.id}/trigger",
        headers=admin_headers,
        json={"inputPayloadJson": "{}"},
    )

    assert response.status_code == 400
    body = response.json()
    assert body["errorCode"] == "CIRCULAR_DEPENDENCY"
    assert body["cycleNodes"] == ["fraud-detection", "transaction-approval"]
    assert body["processedCount"] == 2
    assert body["totalNodes"] == 4
    assert store.list_instances(workflow_id=workflow.id) == []
    assert store.tasks == {}
    worker_poll = await client.post(
        "/api/v1/tasks/poll",
        json={"workerId": "worker-default-01", "queues": ["default"]},
    )
    assert worker_poll.status_code == 200
    assert worker_poll.json()["task"] is None
