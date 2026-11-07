import pytest
from app.core.exceptions import AppException
from app.domain.dag_engine import DagEngine
from app.domain.dag_validation import DagIntegrityValidator, KahnScheduler
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
    assert exc_info.value.error_code == "CIRCULAR_DEPENDENCY"
    assert "chu trình phụ thuộc" in exc_info.value.detail_message
    assert exc_info.value.metadata == {
        "cycleNodes": ["a", "b"],
        "blockedNodes": [],
        "processedCount": 0,
        "totalNodes": 2,
    }

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


def test_kahn_valid_dag_returns_execution_plan():
    dag = DagDefinition(steps=[
        DagStep(id="root", name="Root"),
        DagStep(id="left", name="Left", dependsOn=["root"]),
        DagStep(id="right", name="Right", dependsOn=["root"]),
        DagStep(id="join", name="Join", dependsOn=["left", "right"]),
    ])

    assert DagEngine.compute_execution_layers(dag) == [
        ["root"],
        ["left", "right"],
        ["join"],
    ]


def test_kahn_two_node_cycle_reports_cycle_members():
    dag = DagDefinition(steps=[
        DagStep(id="fraud-detection", name="Fraud Detection", dependsOn=["transaction-approval"]),
        DagStep(id="transaction-approval", name="Transaction Approval", dependsOn=["fraud-detection"]),
    ])

    analysis = KahnScheduler.analyze(dag)

    assert analysis.processed_count == 0
    assert analysis.execution_plan is None
    assert set(analysis.cycle_nodes) == {"fraud-detection", "transaction-approval"}
    assert analysis.blocked_nodes == []
    with pytest.raises(AppException, match="chu trình phụ thuộc"):
        DagEngine.compute_execution_layers(dag)


def test_kahn_three_node_cycle_is_rejected():
    dag = DagDefinition(steps=[
        DagStep(id="a", name="A", dependsOn=["c"]),
        DagStep(id="b", name="B", dependsOn=["a"]),
        DagStep(id="c", name="C", dependsOn=["b"]),
    ])

    analysis = KahnScheduler.analyze(dag)

    assert analysis.execution_plan is None
    assert set(analysis.cycle_nodes) == {"a", "b", "c"}
    assert analysis.blocked_nodes == []


def test_self_dependency_is_rejected():
    dag = DagDefinition(steps=[DagStep(id="self", name="Self", dependsOn=["self"])])

    with pytest.raises(AppException, match="cannot depend on itself"):
        DagEngine.validate_dag(dag)


def test_missing_dependency_is_rejected():
    dag = DagDefinition(steps=[DagStep(id="task", name="Task", dependsOn=["missing"])])

    with pytest.raises(AppException, match="non-existent"):
        DagEngine.validate_dag(dag)


def test_duplicate_task_id_is_rejected():
    dag = DagDefinition(steps=[
        DagStep(id="same", name="First"),
        DagStep(id="same", name="Second"),
    ])

    with pytest.raises(AppException, match="Duplicate step ID"):
        DagEngine.validate_dag(dag)


def test_duplicate_dependency_is_rejected():
    dag = DagDefinition(steps=[
        DagStep(id="root", name="Root"),
        DagStep(id="child", name="Child", dependsOn=["root", "root"]),
    ])

    with pytest.raises(AppException, match="duplicate dependency"):
        DagEngine.validate_dag(dag)


@pytest.mark.parametrize(
    "normalized_dependencies",
    [[], ["root", "extra"]],
    ids=["lost-dependency", "changed-dependency"],
)
def test_dependency_changes_during_normalization_are_rejected(normalized_dependencies):
    raw_steps = [
        {"id": "root", "dependsOn": []},
        {"id": "child", "dependsOn": ["root"]},
    ]
    normalized = DagDefinition(steps=[
        DagStep(id="root", name="Root"),
        DagStep(id="child", name="Child", dependsOn=normalized_dependencies),
    ])

    with pytest.raises(AppException, match="changed task IDs or dependencies"):
        DagIntegrityValidator.validate_dependency_preservation(raw_steps, normalized)


def test_kahn_separates_cycle_members_from_downstream_blocked_tasks():
    dag = DagDefinition(steps=[
        DagStep(id="root", name="Root"),
        DagStep(id="fraud", name="Fraud", dependsOn=["approval"]),
        DagStep(id="approval", name="Approval", dependsOn=["fraud"]),
        DagStep(id="review", name="Review", dependsOn=["fraud"]),
        DagStep(id="notify", name="Notify", dependsOn=["review"]),
    ])

    analysis = KahnScheduler.analyze(dag)

    assert analysis.processed_count == 1
    assert analysis.execution_plan is None
    assert set(analysis.cycle_nodes) == {"fraud", "approval"}
    assert set(analysis.blocked_nodes) == {"review", "notify"}


def test_kahn_keeps_independent_branches_in_parallel_levels():
    dag = DagDefinition(steps=[
        DagStep(id="input", name="Input"),
        DagStep(id="fraud", name="Fraud", dependsOn=["input"]),
        DagStep(id="approval", name="Approval", dependsOn=["input"]),
        DagStep(id="settlement", name="Settlement", dependsOn=["fraud", "approval"]),
    ])

    assert DagEngine.compute_execution_layers(dag) == [
        ["input"],
        ["fraud", "approval"],
        ["settlement"],
    ]
