from collections import deque
from dataclasses import dataclass
from typing import Dict, List, Optional, Set

from app.core.exceptions import AppException
from app.domain.models import DagDefinition


@dataclass(frozen=True)
class KahnAnalysis:
    execution_plan: Optional[List[List[str]]]
    processed_count: int
    cycle_nodes: List[str]
    blocked_nodes: List[str]


class DagIntegrityValidator:
    @staticmethod
    def validate_dependency_preservation(raw_steps: list[dict], dag: DagDefinition) -> None:
        raw_dependencies: Dict[str, List[str]] = {}
        for step in raw_steps:
            step_id = step.get("id")
            dependencies = step.get("dependsOn", [])
            if dependencies is None:
                dependencies = []
            if not isinstance(step_id, str) or not isinstance(dependencies, list):
                raise AppException.validation("DAG normalization received invalid task IDs or dependencies.")
            if step_id in raw_dependencies:
                raise AppException.validation(f"Duplicate step ID '{step_id}' found before DAG normalization.")
            if any(not isinstance(dependency, str) for dependency in dependencies):
                raise AppException.validation(f"Step '{step_id}' has a non-string dependency.")
            raw_dependencies[step_id] = dependencies

        normalized_dependencies = {step.id: step.dependsOn for step in dag.steps}
        if raw_dependencies != normalized_dependencies:
            changed_steps = sorted(
                set(raw_dependencies) | set(normalized_dependencies),
                key=str,
            )
            changed_steps = [
                step_id
                for step_id in changed_steps
                if raw_dependencies.get(step_id) != normalized_dependencies.get(step_id)
            ]
            raise AppException.validation(
                "DAG normalization changed task IDs or dependencies for steps: "
                f"{changed_steps}."
            )

    @staticmethod
    def validate_structure(dag: DagDefinition) -> None:
        if not dag.steps:
            raise AppException.validation("Workflow must define at least one step.")

        step_ids: Set[str] = set()
        for step in dag.steps:
            if not step.id or not step.id.strip() or step.id != step.id.strip():
                raise AppException.validation("Step IDs must be non-empty strings without surrounding whitespace.")
            if step.id in step_ids:
                raise AppException.validation(f"Duplicate step ID '{step.id}' found in workflow.")
            step_ids.add(step.id)

        for step in dag.steps:
            seen_dependencies: Set[str] = set()
            for dependency in step.dependsOn:
                if not dependency or not dependency.strip() or dependency != dependency.strip():
                    raise AppException.validation(
                        f"Step '{step.id}' has an empty or malformed dependency ID."
                    )
                if dependency in seen_dependencies:
                    raise AppException.validation(
                        f"Step '{step.id}' has duplicate dependency '{dependency}'."
                    )
                seen_dependencies.add(dependency)
                if dependency not in step_ids:
                    raise AppException.validation(
                        f"Step '{step.id}' depends on non-existent step '{dependency}'."
                    )
                if dependency == step.id:
                    raise AppException.validation(f"Step '{step.id}' cannot depend on itself.")


class KahnScheduler:
    @staticmethod
    def analyze(dag: DagDefinition) -> KahnAnalysis:
        DagIntegrityValidator.validate_structure(dag)

        in_degree = {step.id: len(step.dependsOn) for step in dag.steps}
        adjacency = {step.id: [] for step in dag.steps}
        reverse_adjacency = {step.id: [] for step in dag.steps}
        for step in dag.steps:
            for dependency in step.dependsOn:
                adjacency[dependency].append(step.id)
                reverse_adjacency[step.id].append(dependency)

        current_layer = [step.id for step in dag.steps if in_degree[step.id] == 0]
        levels: List[List[str]] = []
        processed_count = 0
        while current_layer:
            levels.append(current_layer)
            next_layer: List[str] = []
            for step_id in current_layer:
                processed_count += 1
                for dependent_id in adjacency[step_id]:
                    in_degree[dependent_id] -= 1
                    if in_degree[dependent_id] == 0:
                        next_layer.append(dependent_id)
            current_layer = next_layer

        if processed_count == len(dag.steps):
            return KahnAnalysis(levels, processed_count, [], [])

        residual = {step_id for step_id, degree in in_degree.items() if degree > 0}
        cycle_nodes = KahnScheduler._find_cycle_nodes(residual, adjacency, reverse_adjacency)
        blocked_nodes = residual - cycle_nodes
        return KahnAnalysis(
            None,
            processed_count,
            [step.id for step in dag.steps if step.id in cycle_nodes],
            [step.id for step in dag.steps if step.id in blocked_nodes],
        )

    @staticmethod
    def _find_cycle_nodes(
        residual: Set[str],
        adjacency: Dict[str, List[str]],
        reverse_adjacency: Dict[str, List[str]],
    ) -> Set[str]:
        visited: Set[str] = set()
        finishing_order: List[str] = []
        for start in residual:
            if start in visited:
                continue
            visited.add(start)
            stack = [(start, iter(v for v in adjacency[start] if v in residual))]
            while stack:
                node, children = stack[-1]
                child = next(children, None)
                if child is None:
                    finishing_order.append(node)
                    stack.pop()
                elif child not in visited:
                    visited.add(child)
                    stack.append((child, iter(v for v in adjacency[child] if v in residual)))

        assigned: Set[str] = set()
        cycle_nodes: Set[str] = set()
        for start in reversed(finishing_order):
            if start in assigned:
                continue
            component: Set[str] = set()
            stack = [start]
            assigned.add(start)
            while stack:
                node = stack.pop()
                component.add(node)
                for parent in reverse_adjacency[node]:
                    if parent in residual and parent not in assigned:
                        assigned.add(parent)
                        stack.append(parent)
            if len(component) > 1 or any(node in adjacency[node] for node in component):
                cycle_nodes.update(component)
        return cycle_nodes
