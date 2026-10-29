import pytest
from app.core.exceptions import AppException
from app.domain.dag_engine import DagEngine
from app.domain.models import DagDefinition, DagStep, TaskType

def test_validate_dag_valid():
    dag = DagDefinition(
        steps=[
            DagStep(id="s1", name="Step 1", type=TaskType.WORKER_TASK, dependsOn=[]),
            DagStep(id="s2", name="Step 2", type=TaskType.WORKER_TASK, dependsOn=["s1"]),
        ]
    )
    DagEngine.validate_dag(dag) # Should not raise

def test_validate_dag_cycle_raises():
    dag = DagDefinition(
        steps=[
            DagStep(id="a", name="A", type=TaskType.WORKER_TASK, dependsOn=["b"]),
            DagStep(id="b", name="B", type=TaskType.WORKER_TASK, dependsOn=["a"]),
        ]
    )
    with pytest.raises(AppException) as exc_info:
        DagEngine.validate_dag(dag)
    assert exc_info.value.status_code == 400
    assert "Cyclic" in exc_info.value.detail_message

def test_validate_dag_nonexistent_dependency():
    dag = DagDefinition(
        steps=[
            DagStep(id="a", name="A", type=TaskType.WORKER_TASK, dependsOn=["ghost"]),
        ]
    )
    with pytest.raises(AppException) as exc_info:
        DagEngine.validate_dag(dag)
    assert exc_info.value.status_code == 400
    assert "non-existent" in exc_info.value.detail_message

def test_get_ready_steps_initial():
    dag = DagDefinition(
        steps=[
            DagStep(id="root1", name="Root 1", type=TaskType.WORKER_TASK, dependsOn=[]),
            DagStep(id="root2", name="Root 2", type=TaskType.WORKER_TASK, dependsOn=[]),
            DagStep(id="child", name="Child", type=TaskType.WORKER_TASK, dependsOn=["root1", "root2"]),
        ]
    )
    ready = DagEngine.get_ready_steps(dag, set(), set())
    assert len(ready) == 2
    step_ids = {s.id for s in ready}
    assert step_ids == {"root1", "root2"}

def test_get_ready_steps_dependency_resolved():
    dag = DagDefinition(
        steps=[
            DagStep(id="root1", name="Root 1", type=TaskType.WORKER_TASK, dependsOn=[]),
            DagStep(id="root2", name="Root 2", type=TaskType.WORKER_TASK, dependsOn=[]),
            DagStep(id="child", name="Child", type=TaskType.WORKER_TASK, dependsOn=["root1", "root2"]),
        ]
    )
    # Only root1 completed
    ready = DagEngine.get_ready_steps(dag, {"root1"}, {"root1"})
    assert len(ready) == 1
    assert ready[0].id == "root2"

    # Both completed
    ready_all = DagEngine.get_ready_steps(dag, {"root1", "root2"}, {"root1", "root2"})
    assert len(ready_all) == 1
    assert ready_all[0].id == "child"
