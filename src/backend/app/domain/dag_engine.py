from collections import deque
from typing import List, Set
from app.core.exceptions import AppException
from app.domain.models import DagDefinition, DagStep

class DagEngine:
    @staticmethod
    def validate_dag(dag: DagDefinition) -> None:
        if not dag.steps:
            raise AppException.validation("Workflow must define at least one step.")

        step_ids: Set[str] = set()
        for step in dag.steps:
            if not step.id or not step.id.strip():
                raise AppException.validation("Step id cannot be empty.")
            step_id_clean = step.id.strip()
            if step_id_clean in step_ids:
                raise AppException.validation(f"Duplicate step ID '{step.id}' found in workflow.")
            step_ids.add(step_id_clean)

        for step in dag.steps:
            for dep in step.dependsOn:
                if dep not in step_ids:
                    raise AppException.validation(f"Step '{step.id}' depends on non-existent step '{dep}'.")
                if step.id == dep:
                    raise AppException.validation(f"Step '{step.id}' cannot depend on itself.")

        # Cycle detection using Kahn's algorithm
        in_degree = {step.id: len(step.dependsOn) for step in dag.steps}
        adj = {step.id: [] for step in dag.steps}

        for step in dag.steps:
            for dep in step.dependsOn:
                adj[dep].append(step.id)

        queue = deque([step_id for step_id, degree in in_degree.items() if degree == 0])
        visited_count = 0

        while queue:
            u = queue.popleft()
            visited_count += 1
            for v in adj[u]:
                in_degree[v] -= 1
                if in_degree[v] == 0:
                    queue.append(v)

        if visited_count != len(dag.steps):
            raise AppException.validation("Cyclic dependency detected in workflow DAG definition.")

    @staticmethod
    def get_ready_steps(
        dag: DagDefinition,
        completed_step_ids: Set[str],
        executed_or_running_step_ids: Set[str]
    ) -> List[DagStep]:
        ready: List[DagStep] = []
        for step in dag.steps:
            if step.id in executed_or_running_step_ids:
                continue

            all_deps_satisfied = all(dep in completed_step_ids for dep in step.dependsOn)
            if all_deps_satisfied:
                ready.append(step)
        return ready
