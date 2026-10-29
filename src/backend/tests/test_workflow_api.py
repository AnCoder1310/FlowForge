import pytest

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
    res = await client.get("/api/v1/workflows", headers=admin_headers)
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
