import pytest

@pytest.mark.anyio
async def test_worker_registration_and_heartbeat(client, admin_headers):
    # Register
    reg_res = await client.post(
        "/api/v1/workers/register",
        json={
            "workerId": "worker-unit-test-01",
            "hostname": "test-box.local",
            "supportedQueues": ["data-io", "compute"],
            "maxConcurrency": 8
        }
    )
    assert reg_res.status_code == 200
    assert reg_res.json()["workerId"] == "worker-unit-test-01"

    # Heartbeat
    hb_res = await client.post("/api/v1/workers/worker-unit-test-01/heartbeat")
    assert hb_res.status_code == 204

@pytest.mark.anyio
async def test_worker_poll_and_complete_task(client, admin_headers):
    # 1. Trigger workflow
    trigger_res = await client.post(
        "/api/v1/executions/workflows/1/trigger",
        headers=admin_headers,
        json={"inputPayloadJson": "{\"test\":true}"}
    )
    assert trigger_res.status_code == 201

    # 2. Worker polls task from data-io queue
    poll_res = await client.post(
        "/api/v1/tasks/poll",
        json={
            "workerId": "worker-unit-test-01",
            "queues": ["data-io"]
        }
    )
    assert poll_res.status_code == 200
    polled = poll_res.json()
    assert polled["task"] is not None
    task_id = polled["task"]["id"]
    assert polled["task"]["status"] == "RUNNING"
    assert polled["task"]["assignedWorkerId"] == "worker-unit-test-01"

    # 3. Complete task
    complete_res = await client.post(
        f"/api/v1/tasks/{task_id}/complete",
        json={"outputPayloadJson": "{\"recordsProcessed\":500}"}
    )
    assert complete_res.status_code == 200
    assert complete_res.json()["status"] == "COMPLETED"

    # 4. Now the next step (step-transform in 'compute' queue) should be SCHEDULED
    poll_next = await client.post(
        "/api/v1/tasks/poll",
        json={
            "workerId": "worker-unit-test-01",
            "queues": ["compute"]
        }
    )
    assert poll_next.status_code == 200
    next_polled = poll_next.json()
    assert next_polled["task"] is not None
    assert next_polled["task"]["stepId"] == "step-transform"
