from typing import List, Set
from app.core.exceptions import AppException
from app.domain.models import DagDefinition, DagStep
from app.domain.dag_validation import KahnScheduler

class DagEngine:
    @staticmethod
    def validate_dag(dag: DagDefinition) -> None:
        DagEngine.compute_execution_layers(dag)

    @staticmethod
    def compute_execution_layers(dag: DagDefinition) -> List[List[str]]:
        """
        Topological stage partitioning using Kahn's algorithm.
        Returns a list of stages (layers), where all steps in a layer can be executed in parallel.
        """
        analysis = KahnScheduler.analyze(dag)
        if analysis.execution_plan is None:
            raise AppException.circular_dependency(
                "Phát hiện chu trình phụ thuộc trong DAG; workflow không thể được thực thi. "
                f"Các tác vụ trong chu trình: {analysis.cycle_nodes}. "
                f"Các tác vụ bị chu trình chặn: {analysis.blocked_nodes}. "
                f"Kahn đã xử lý {analysis.processed_count}/{len(dag.steps)} tác vụ.",
                cycle_nodes=analysis.cycle_nodes,
                blocked_nodes=analysis.blocked_nodes,
                processed_count=analysis.processed_count,
                total_nodes=len(dag.steps),
            )
        return analysis.execution_plan

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
