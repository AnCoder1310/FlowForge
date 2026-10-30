import pytest
from datetime import datetime, timezone, timedelta
from app.persistence.store import store
from app.domain.models import StepStatus, WorkerStatus

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

@pytest.mark.anyio
async def test_atomic_task_claiming_single_winner(client, admin_headers):
    # Trigger workflow to get a scheduled task
    trigger_res = await client.post(
        "/api/v1/executions/workflows/1/trigger",
        headers=admin_headers,
        json={"inputPayloadJson": "{}"}
    )
    assert trigger_res.status_code == 201

    # Worker A polls task
    poll_a = await client.post(
        "/api/v1/tasks/poll",
        json={"workerId": "worker-data-01", "queues": ["data-io"]}
    )
    assert poll_a.status_code == 200
    polled_a = poll_a.json()
    assert polled_a["task"] is not None
    task_id = polled_a["task"]["id"]

    # Worker B simultaneously attempts to poll data-io: must NOT get the same task
    poll_b = await client.post(
        "/api/v1/tasks/poll",
        json={"workerId": "worker-data-02", "queues": ["data-io"]}
    )
    assert poll_b.status_code == 200
    polled_b = poll_b.json()
    if polled_b["task"]:
        assert polled_b["task"]["id"] != task_id

@pytest.mark.anyio
async def test_worker_queue_filtering(client, admin_headers):
    # Worker listening only on 'payment' cannot poll a 'data-io' task
    poll_res = await client.post(
        "/api/v1/tasks/poll",
        json={"workerId": "worker-payment-test", "queues": ["payment"]}
    )
    assert poll_res.status_code == 200
    polled = poll_res.json()
    # If a task is returned, it must strictly be in the 'payment' queue
    if polled["task"]:
        assert polled["task"]["queueName"] == "payment"

@pytest.mark.anyio
async def test_worker_concurrency_limit_enforced(client, admin_headers):
    # Register a worker with strict maxConcurrency = 1
    await client.post(
        "/api/v1/workers/register",
        json={
            "workerId": "worker-concurrency-test",
            "hostname": "local",
            "supportedQueues": ["data-io", "compute", "default"],
            "maxConcurrency": 1
        }
    )

    # Trigger a workflow
    await client.post(
        "/api/v1/executions/workflows/1/trigger",
        headers=admin_headers,
        json={"inputPayloadJson": "{}"}
    )

    # First poll claims 1 task -> slots full (1/1)
    p1 = await client.post(
        "/api/v1/tasks/poll",
        json={"workerId": "worker-concurrency-test", "queues": ["data-io"]}
    )
    assert p1.status_code == 200
    t1 = p1.json().get("task")
    assert t1 is not None

    # Second poll by same worker must return None because currentLoad == maxConcurrency
    p2 = await client.post(
        "/api/v1/tasks/poll",
        json={"workerId": "worker-concurrency-test", "queues": ["data-io"]}
    )
    assert p2.status_code == 200
    assert p2.json().get("task") is None

    # Complete the task -> slot released (0/1)
    await client.post(f"/api/v1/tasks/{t1['id']}/complete", json={"outputPayloadJson": "{}"})
    worker = store.workers.get("worker-concurrency-test")
    assert worker.currentLoad == 0

@pytest.mark.anyio
async def test_parallel_tasks_dispatched_and_claimed_by_distinct_workers(client, admin_headers):
    # Create workflow with 2 parallel branches:
    # root (default) -> branch-ai (ai-agent) & branch-compute (compute) -> join (data-io)
    wf_payload = {
        "name": "Parallel-Branch-Workflow",
        "description": "Tests parallel multi-worker dispatch",
        "dag": {
            "steps": [
                {"id": "step-root", "name": "Root Ingest", "type": "HTTP_TASK", "queue": "default", "dependsOn": [], "maxRetries": 2, "timeoutSeconds": 30},
                {"id": "step-ai-branch", "name": "AI Inference", "type": "AI_AGENT_TASK", "queue": "ai-agent", "dependsOn": ["step-root"], "maxRetries": 2, "timeoutSeconds": 60},
                {"id": "step-compute-branch", "name": "Compute Transform", "type": "WORKER_TASK", "queue": "compute-pool", "dependsOn": ["step-root"], "maxRetries": 2, "timeoutSeconds": 60},
                {"id": "step-join", "name": "Join Aggregate", "type": "WORKER_TASK", "queue": "join-io", "dependsOn": ["step-ai-branch", "step-compute-branch"], "maxRetries": 2, "timeoutSeconds": 60}
            ]
        }
    }
    create_wf = await client.post("/api/v1/workflows", headers=admin_headers, json=wf_payload)
    assert create_wf.status_code == 201
    wf_id = create_wf.json()["id"]

    # Trigger execution
    trig = await client.post(f"/api/v1/executions/workflows/{wf_id}/trigger", headers=admin_headers, json={"inputPayloadJson": "{}"})
    assert trig.status_code == 201

    # Complete root task
    poll_root = await client.post("/api/v1/tasks/poll", json={"workerId": "worker-default-01", "queues": ["default"]})
    assert poll_root.status_code == 200
    root_task = poll_root.json()["task"]
    assert root_task["stepId"] == "step-root"

    comp_root = await client.post(f"/api/v1/tasks/{root_task['id']}/complete", json={"outputPayloadJson": "{\"ok\":true}"})
    assert comp_root.status_code == 200

    # BOTH branch-ai and branch-compute must now be SCHEDULED in parallel!
    # worker-ai-01 claims AI task
    poll_ai = await client.post("/api/v1/tasks/poll", json={"workerId": "worker-ai-01", "queues": ["ai-agent"]})
    assert poll_ai.status_code == 200
    ai_task = poll_ai.json()["task"]
    assert ai_task is not None
    assert ai_task["stepId"] == "step-ai-branch"
    assert ai_task["assignedWorkerId"] == "worker-ai-01"

    # worker-compute-01 claims Compute task in parallel
    poll_compute = await client.post("/api/v1/tasks/poll", json={"workerId": "worker-compute-01", "queues": ["compute-pool"]})
    assert poll_compute.status_code == 200
    compute_task = poll_compute.json()["task"]
    assert compute_task is not None
    assert compute_task["stepId"] == "step-compute-branch"
    assert compute_task["assignedWorkerId"] == "worker-compute-01"

    # Join step must still be PENDING until BOTH complete
    poll_join = await client.post("/api/v1/tasks/poll", json={"workerId": "worker-data-01", "queues": ["join-io"]})
    if poll_join.json()["task"]:
        assert poll_join.json()["task"]["stepId"] != "step-join"

    # Complete AI branch only
    await client.post(f"/api/v1/tasks/{ai_task['id']}/complete", json={"outputPayloadJson": "{}"})

    # Join step still cannot run (waiting for compute branch)
    poll_join2 = await client.post("/api/v1/tasks/poll", json={"workerId": "worker-data-01", "queues": ["join-io"]})
    if poll_join2.json()["task"]:
        assert poll_join2.json()["task"]["stepId"] != "step-join"

    # Complete Compute branch -> fan-in join satisfied!
    await client.post(f"/api/v1/tasks/{compute_task['id']}/complete", json={"outputPayloadJson": "{}"})

    # Now join step is SCHEDULED and can be claimed
    poll_join3 = await client.post("/api/v1/tasks/poll", json={"workerId": "worker-data-01", "queues": ["join-io"]})
    assert poll_join3.status_code == 200
    join_task = poll_join3.json()["task"]
    assert join_task is not None
    assert join_task["stepId"] == "step-join"

@pytest.mark.anyio
async def test_stale_worker_and_task_timeout_recovery(client, admin_headers):
    # Register temporary worker
    await client.post(
        "/api/v1/workers/register",
        json={"workerId": "worker-ghost-01", "hostname": "ghost", "supportedQueues": ["compute"], "maxConcurrency": 2}
    )

    # Artificially set worker heartbeat to 10 minutes ago
    old_time = datetime.now(timezone.utc) - timedelta(minutes=10)
    w = store.workers["worker-ghost-01"]
    store.workers["worker-ghost-01"] = w.model_copy(update={"lastHeartbeatAt": old_time})

    # Trigger workflow
    await client.post("/api/v1/executions/workflows/1/trigger", headers=admin_headers, json={"inputPayloadJson": "{}"})

    # Run reclaim
    reclaim_res = await client.post("/api/v1/tasks/reclaim-stale")
    assert reclaim_res.status_code == 200
    # Ghost worker should now be OFFLINE
    assert store.workers["worker-ghost-01"].status == WorkerStatus.OFFLINE

@pytest.mark.anyio
async def test_complete_task_idempotency(client, admin_headers):
    # Trigger workflow
    await client.post("/api/v1/executions/workflows/1/trigger", headers=admin_headers, json={"inputPayloadJson": "{}"})
    poll = await client.post("/api/v1/tasks/poll", json={"workerId": "worker-default-01", "queues": ["data-io"]})
    task = poll.json().get("task")
    if task:
        # First completion
        c1 = await client.post(f"/api/v1/tasks/{task['id']}/complete", json={"outputPayloadJson": "{\"test\":1}"})
        assert c1.status_code == 200
        # Duplicate completion: should not raise 500 and should remain COMPLETED
        c2 = await client.post(f"/api/v1/tasks/{task['id']}/complete", json={"outputPayloadJson": "{\"test\":1}"})
        assert c2.status_code == 200
        assert c2.json()["status"] == "COMPLETED"
