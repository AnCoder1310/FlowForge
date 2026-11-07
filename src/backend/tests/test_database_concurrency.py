import json
import multiprocessing
import os
import shutil
import sqlite3
import tempfile
import uuid
from contextlib import contextmanager
from datetime import datetime, timezone

import pytest

from app.domain.models import (
    DagDefinition,
    DagStep,
    StepStatus,
    TaskExecution,
    TaskType,
    TriggerWorkflowRequest,
    WorkflowDefinition,
    WorkflowInstance,
    WorkflowStatus,
)
from app.persistence.database import get_db_connection
from app.persistence.store import store
from app.services.execution_service import ExecutionService


_DATABASE_TEMPLATE = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "database", "workflow_orchestrator.db")
)


def _process_operation(barrier, result_queue, db_path, workflow_id, operation, worker_id):
    os.environ["SQLITE_DB_PATH"] = db_path
    try:
        barrier.wait(timeout=60)
        if operation == "trigger":
            instance = ExecutionService.trigger_workflow(
                workflow_id,
                TriggerWorkflowRequest(inputPayloadJson="{}"),
                store.users[1],
            )
            result = {
                "instanceId": instance.id,
                "tasks": [{"id": task.id, "instanceId": task.instanceId} for task in instance.tasks or []],
            }
        else:
            task = store.poll_scheduled_task(worker_id, ["default"])
            result = {"taskId": task.id if task else None}
        result_queue.put({"worker": worker_id, "result": result})
    except BaseException as exc:
        result_queue.put({"worker": worker_id, "error": f"{type(exc).__name__}: {exc}"})


def _run_processes(db_path, workflow_id, process_count, operation="trigger"):
    context = multiprocessing.get_context("fork")
    barrier = context.Barrier(process_count + 1)
    result_queue = context.Queue()
    processes = [
        context.Process(
            target=_process_operation,
            args=(barrier, result_queue, db_path, workflow_id, operation, f"audit-worker-{index}"),
        )
        for index in range(process_count)
    ]
    for process in processes:
        process.start()
    barrier.wait(timeout=60)

    for process in processes:
        process.join(timeout=90)
        if process.is_alive():
            process.terminate()
            process.join()
            pytest.fail(f"Process {process.pid} timed out during {operation}")
        assert process.exitcode == 0, f"Process {process.pid} exited with {process.exitcode}"

    results = [result_queue.get(timeout=10) for _ in processes]
    errors = [result for result in results if "error" in result]
    assert not errors, f"Database/process errors (including possible lock errors): {errors}"
    return results


@contextmanager
def _isolated_database():
    with tempfile.TemporaryDirectory(prefix="flowforge-db-concurrency-") as directory:
        original_db_path = os.environ.get("SQLITE_DB_PATH")
        original_workflow_ids = set(store.workflows)
        original_instance_ids = set(store.instances)
        original_task_ids = set(store.tasks)
        db_path = os.path.join(directory, "workflow_orchestrator.db")
        shutil.copyfile(_DATABASE_TEMPLATE, db_path)
        os.environ["SQLITE_DB_PATH"] = db_path
        workflow_name = f"Concurrent-Trigger-{uuid.uuid4()}"
        dag_json = {
            "steps": [
                {
                    "id": "first",
                    "name": "First",
                    "type": "WORKER_TASK",
                    "queue": "default",
                    "dependsOn": [],
                    "maxRetries": 1,
                    "timeoutSeconds": 30,
                },
                {
                    "id": "second",
                    "name": "Second",
                    "type": "WORKER_TASK",
                    "queue": "default",
                    "dependsOn": ["first"],
                    "maxRetries": 1,
                    "timeoutSeconds": 30,
                },
            ]
        }
        connection = sqlite3.connect(db_path, timeout=30)
        connection.execute("PRAGMA foreign_keys = ON")
        connection.execute(
            """
            DELETE FROM workflow_instances
            WHERE workflow_id NOT IN (SELECT id FROM workflow_definitions)
            """
        )
        cursor = connection.execute(
            """
            INSERT INTO workflow_definitions (name, version, dag_definition, is_active, created_by)
            VALUES (?, 1, ?, 1, 1)
            """,
            (workflow_name, json.dumps(dag_json)),
        )
        workflow_id = cursor.lastrowid
        connection.commit()
        connection.close()

        workflow = WorkflowDefinition(
            id=workflow_id,
            name=workflow_name,
            version=1,
            dag=DagDefinition(steps=[
                DagStep(id="first", name="First", type=TaskType.WORKER_TASK, queue="default", dependsOn=[]),
                DagStep(id="second", name="Second", type=TaskType.WORKER_TASK, queue="default", dependsOn=["first"]),
            ]),
            isActive=True,
            createdBy=1,
            createdAt=datetime.now(timezone.utc),
            updatedAt=datetime.now(timezone.utc),
        )
        store.workflows[workflow_id] = workflow
        try:
            yield db_path, workflow_id
        finally:
            for key in set(store.workflows) - original_workflow_ids:
                store.workflows.pop(key, None)
            for key in set(store.instances) - original_instance_ids:
                store.instances.pop(key, None)
            for key in set(store.tasks) - original_task_ids:
                store.tasks.pop(key, None)
            if original_db_path is None:
                os.environ.pop("SQLITE_DB_PATH", None)
            else:
                os.environ["SQLITE_DB_PATH"] = original_db_path


def _verify_trigger_records(db_path, workflow_id, expected_instances):
    connection = sqlite3.connect(db_path, timeout=30)
    connection.row_factory = sqlite3.Row
    instances = connection.execute(
        "SELECT id FROM workflow_instances WHERE workflow_id = ? ORDER BY id",
        (workflow_id,),
    ).fetchall()
    tasks = connection.execute(
        """
        SELECT t.id, t.instance_id, t.step_id
        FROM task_executions t
        JOIN workflow_instances i ON i.id = t.instance_id
        WHERE i.workflow_id = ?
        ORDER BY t.id
        """,
        (workflow_id,),
    ).fetchall()
    integrity = connection.execute("PRAGMA integrity_check").fetchone()[0]
    foreign_key_errors = connection.execute("PRAGMA foreign_key_check").fetchall()
    connection.close()

    instance_ids = [row["id"] for row in instances]
    task_ids = [row["id"] for row in tasks]
    assert len(instance_ids) == expected_instances
    assert len(set(instance_ids)) == expected_instances
    assert len(tasks) == expected_instances * 2
    assert len(set(task_ids)) == len(task_ids)
    assert all(row["step_id"] in {"first", "second"} for row in tasks)
    assert all(row["instance_id"] in set(instance_ids) for row in tasks)
    assert all(
        sum(task["instance_id"] == instance_id for task in tasks) == 2
        for instance_id in instance_ids
    )
    assert integrity == "ok"
    assert foreign_key_errors == []


@pytest.mark.parametrize("process_count", [2, 10, 50])
def test_concurrent_triggers_use_unique_database_ids(process_count):
    with _isolated_database() as (db_path, workflow_id):
        results = _run_processes(db_path, workflow_id, process_count)
        assert len({result["result"]["instanceId"] for result in results}) == process_count
        assert all(len(result["result"]["tasks"]) == 2 for result in results)
        _verify_trigger_records(db_path, workflow_id, process_count)


def test_concurrent_triggers_repeatedly_do_not_overwrite_records():
    with _isolated_database() as (db_path, workflow_id):
        all_results = []
        for _ in range(3):
            all_results.extend(_run_processes(db_path, workflow_id, 10))
        assert len({result["result"]["instanceId"] for result in all_results}) == 30
        _verify_trigger_records(db_path, workflow_id, 30)


def test_instance_and_tasks_roll_back_together_on_task_insert_failure():
    with _isolated_database() as (db_path, workflow_id):
        now = datetime.now(timezone.utc)
        instance = WorkflowInstance(
            id=0,
            workflowId=workflow_id,
            workflowName="rollback-test",
            version=1,
            status=WorkflowStatus.RUNNING,
            startedAt=now,
            createdAt=now,
            updatedAt=now,
        )
        task = TaskExecution(
            id=0,
            instanceId=0,
            stepId="duplicate",
            stepName="Duplicate",
            taskType=TaskType.WORKER_TASK,
            status=StepStatus.SCHEDULED,
            createdAt=now,
            updatedAt=now,
        )
        before = get_db_connection()
        instance_count = before.execute(
            "SELECT COUNT(*) FROM workflow_instances WHERE workflow_id = ?", (workflow_id,)
        ).fetchone()[0]
        before.close()

        with pytest.raises(sqlite3.IntegrityError):
            store.add_instance_with_tasks(instance, [task, task])

        after = get_db_connection()
        assert after.execute(
            "SELECT COUNT(*) FROM workflow_instances WHERE workflow_id = ?", (workflow_id,)
        ).fetchone()[0] == instance_count
        assert after.execute(
            "SELECT COUNT(*) FROM task_executions WHERE step_id = 'duplicate'"
        ).fetchone()[0] == 0
        after.close()


def test_foreign_key_rejects_task_without_instance():
    with _isolated_database() as (db_path, _workflow_id):
        now = datetime.now(timezone.utc)
        task = TaskExecution(
            id=0,
            instanceId=2_000_000_000,
            stepId="orphan",
            stepName="Orphan",
            taskType=TaskType.WORKER_TASK,
            status=StepStatus.SCHEDULED,
            createdAt=now,
            updatedAt=now,
        )
        with pytest.raises(sqlite3.IntegrityError):
            store.add_task(task)

        connection = get_db_connection()
        assert connection.execute(
            "SELECT COUNT(*) FROM task_executions WHERE step_id = 'orphan'"
        ).fetchone()[0] == 0
        assert connection.execute("PRAGMA foreign_keys").fetchone()[0] == 1
        connection.close()


def test_ten_concurrent_workers_still_claim_one_scheduled_task():
    with _isolated_database() as (db_path, workflow_id):
        instance = ExecutionService.trigger_workflow(
            workflow_id,
            TriggerWorkflowRequest(inputPayloadJson="{}"),
            store.users[1],
        )
        results = _run_processes(db_path, workflow_id, 10, operation="claim")
        claims = [result["result"]["taskId"] for result in results if result["result"]["taskId"]]
        assert len(claims) == 1
        assert claims[0] == instance.tasks[0].id
        assert sum(result["result"]["taskId"] is None for result in results) == 9

        connection = get_db_connection()
        rows = connection.execute(
            "SELECT id, status FROM task_executions WHERE instance_id = ?",
            (instance.id,),
        ).fetchall()
        connection.close()
        assert sum(row["status"] == "RUNNING" for row in rows) == 1
