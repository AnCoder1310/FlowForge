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
    def compute_execution_layers(dag: DagDefinition) -> List[List[str]]:
        """
        Topological stage partitioning using Kahn's algorithm.
        Returns a list of stages (layers), where all steps in a layer can be executed in parallel.
        """
        DagEngine.validate_dag(dag)
        in_degree = {step.id: len(step.dependsOn) for step in dag.steps}
        adj = {step.id: [] for step in dag.steps}
        for step in dag.steps:
            for dep in step.dependsOn:
                adj[dep].append(step.id)

        current_layer = [step.id for step in dag.steps if in_degree[step.id] == 0]
        layers = []
        while current_layer:
            layers.append(current_layer)
            next_layer = []
            for u in current_layer:
                for v in adj[u]:
                    in_degree[v] -= 1
                    if in_degree[v] == 0:
                        next_layer.append(v)
            current_layer = next_layer
        return layers

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

    @staticmethod
    def evaluate_condition(condition_str: str | None, context: dict) -> bool:
        """
        Safely evaluates conditional branching expressions without eval().
        Supports:
          - Field existence/boolean: "hasUrgentReviews", "!hasUrgentReviews"
          - Binary comparisons: "hasUrgentReviews == true", "urgentCount > 0", "status != 'FAILED'"
          - Dotted path navigation: "step-detect-urgent.hasUrgentReviews == true"
        """
        if not condition_str or not condition_str.strip():
            return True
        cond = condition_str.strip()

        # Direct boolean or existence check
        if cond in context:
            val = context[cond]
            if isinstance(val, bool):
                return val
            if isinstance(val, (int, float)):
                return val > 0
            return bool(val)
        if cond.startswith("!") and cond[1:].strip() in context:
            return not bool(context[cond[1:].strip()])

        for op in ("==", "!=", ">=", "<=", ">", "<"):
            if op in cond:
                left_expr, right_expr = cond.split(op, 1)
                left_key = left_expr.strip()
                right_val_str = right_expr.strip()

                left_val = context.get(left_key)
                if left_val is None and "." in left_key:
                    curr = context
                    for part in left_key.split("."):
                        if isinstance(curr, dict) and part in curr:
                            curr = curr[part]
                        else:
                            curr = None
                            break
                    left_val = curr

                if right_val_str.lower() in ("true", "false"):
                    right_val = (right_val_str.lower() == "true")
                elif right_val_str.lower() in ("null", "none"):
                    right_val = None
                else:
                    try:
                        if "." in right_val_str:
                            right_val = float(right_val_str)
                        else:
                            right_val = int(right_val_str)
                    except ValueError:
                        right_val = right_val_str.strip("'\"")

                if op == "==":
                    return left_val == right_val
                elif op == "!=":
                    return left_val != right_val
                elif op == ">":
                    return left_val is not None and left_val > right_val
                elif op == ">=":
                    return left_val is not None and left_val >= right_val
                elif op == "<":
                    return left_val is not None and left_val < right_val
                elif op == "<=":
                    return left_val is not None and left_val <= right_val

        return True
