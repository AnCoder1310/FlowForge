import json
from datetime import datetime, timezone
from typing import Optional
from app.core.exceptions import AppException
from app.domain.dag_engine import DagEngine
from app.domain.models import (
    CompleteTaskRequest,
    FailTaskRequest,
    StepStatus,
    TaskExecution,
    TriggerWorkflowRequest,
    UserAccount,
    UserRole,
    WorkflowInstance,
    WorkflowStatus,
)
from app.persistence.store import store

class ExecutionService:
    @staticmethod
    def trigger_workflow(workflow_id: int, req: TriggerWorkflowRequest, user: UserAccount) -> WorkflowInstance:
        if user.role not in (UserRole.ADMIN, UserRole.OPERATOR, UserRole.DEVELOPER):
            raise AppException.forbidden("Insufficient role to trigger workflow.")

        wf = store.get_workflow(workflow_id)
        if not wf:
            raise AppException.not_found(f"Workflow definition #{workflow_id}")
        if not wf.isActive:
            raise AppException.validation(f"Workflow '{wf.name}' is currently inactive.")

        now = datetime.now(timezone.utc)
        payload = req.inputPayloadJson or "{}"

        instance = WorkflowInstance(
            id=0,
            workflowId=wf.id,
            workflowName=wf.name,
            version=wf.version,
            status=WorkflowStatus.RUNNING,
            inputPayloadJson=payload,
            outputPayloadJson=None,
            contextDataJson="{}",
            errorMessage=None,
            triggeredBy=user.id,
            startedAt=now,
            completedAt=None,
            createdAt=now,
            updatedAt=now,
        )
        created_instance = store.add_instance(instance)

        # Initialize all steps from DAG definition
        ready_steps = DagEngine.get_ready_steps(wf.dag, set(), set())
        ready_step_ids = {s.id for s in ready_steps}
        created_tasks = []
        for step in wf.dag.steps:
            is_ready = step.id in ready_step_ids
            task = TaskExecution(
                id=0,
                instanceId=created_instance.id,
                stepId=step.id,
                stepName=step.name,
                taskType=step.type,
                queueName=step.queue or "default",
                status=StepStatus.SCHEDULED if is_ready else StepStatus.PENDING,
                retryCount=0,
                maxRetries=step.maxRetries,
                timeoutSeconds=step.timeoutSeconds or 300,
                inputPayloadJson=payload if is_ready else "{}",
                outputPayloadJson=None,
                errorMessage=None,
                assignedWorkerId=None,
                scheduledAt=now if is_ready else None,
                claimedAt=None,
                startedAt=None,
                completedAt=None,
                createdAt=now,
                updatedAt=now,
                attempt=1,
                condition=getattr(step, "condition", None),
            )
            created_tasks.append(store.add_task(task))

        store.record_audit("TRIGGER", "WORKFLOW", f"Triggered execution #{created_instance.id} for '{wf.name}'", user.id)
        return created_instance.model_copy(update={"tasks": created_tasks})

    @staticmethod
    def get_execution_detail(instance_id: int) -> dict:
        instance = store.get_instance(instance_id)
        if not instance:
            raise AppException.not_found(f"Execution run #{instance_id}")
        tasks = store.get_tasks_for_instance(instance_id)
        return {
            "instance": instance,
            "tasks": tasks
        }

    @staticmethod
    def list_executions(
        workflow_id: Optional[int] = None,
        status: Optional[WorkflowStatus] = None,
        search: Optional[str] = None,
        page: int = 1,
        page_size: int = 20
    ) -> dict:
        all_items = store.list_instances(workflow_id=workflow_id, status=status, search=search)
        total = len(all_items)
        start = (page - 1) * page_size
        items = all_items[start : start + page_size]
        # Attach tasks to items
        populated = []
        for i in items:
            t = store.get_tasks_for_instance(i.id)
            populated.append(i.model_copy(update={"tasks": t}))

        total_pages = (total + page_size - 1) // page_size if page_size > 0 else 0
        return {
            "items": populated,
            "page": page,
            "pageSize": page_size,
            "totalItems": total,
            "totalPages": total_pages,
        }

    @staticmethod
    def cancel_execution(instance_id: int, user: UserAccount) -> None:
        if user.role not in (UserRole.ADMIN, UserRole.OPERATOR):
            raise AppException.forbidden("Insufficient permissions to cancel execution.")

        instance = store.get_instance(instance_id)
        if not instance:
            raise AppException.not_found(f"Execution run #{instance_id}")

        if instance.status in (WorkflowStatus.COMPLETED, WorkflowStatus.CANCELLED):
            return

        now = datetime.now(timezone.utc)
        updated = instance.model_copy(update={
            "status": WorkflowStatus.CANCELLED,
            "completedAt": now,
            "updatedAt": now
        })
        store.update_instance(updated)

        # Skip pending tasks
        for t in store.get_tasks_for_instance(instance_id):
            if t.status in (StepStatus.PENDING, StepStatus.SCHEDULED, StepStatus.RUNNING):
                store.update_task(t.model_copy(update={"status": StepStatus.SKIPPED, "completedAt": now, "updatedAt": now}))

        store.record_audit("CANCEL", "WORKFLOW", f"Cancelled execution #{instance_id}", user.id)

    @staticmethod
    def complete_task(task_id: int, req: CompleteTaskRequest) -> TaskExecution:
        task = store.get_task(task_id)
        if not task:
            raise AppException.not_found(f"Task execution #{task_id}")

        if task.status == StepStatus.COMPLETED:
            return task

        now = datetime.now(timezone.utc)
        updated_task = task.model_copy(update={
            "status": StepStatus.COMPLETED,
            "outputPayloadJson": req.outputPayloadJson,
            "completedAt": now,
            "updatedAt": now,
        })
        store.update_task(updated_task)
        store.release_worker_slot(task.assignedWorkerId, completed=True)

        # Advance DAG State Machine with Conditional Branching, Join Resolution & Cascade Skipping
        released_step_names = []
        instance = store.get_instance(task.instanceId)
        if instance and instance.status == WorkflowStatus.RUNNING:
            wf = store.get_workflow(instance.workflowId)
            if wf:
                # 1. Build aggregated execution context across root input + all finished tasks
                context = {}
                try:
                    if instance.inputPayloadJson:
                        root_in = json.loads(instance.inputPayloadJson)
                        if isinstance(root_in, dict):
                            context.update(root_in)
                except Exception:
                    pass

                all_tasks = store.get_tasks_for_instance(instance.id)
                for t in all_tasks:
                    if t.outputPayloadJson:
                        try:
                            t_out = json.loads(t.outputPayloadJson)
                            if isinstance(t_out, dict):
                                context.update(t_out)
                                context[t.stepId] = t_out
                        except Exception:
                            pass

                # 2. Iterative cascade loop: advance all ready downstream steps (handling parallel joins and condition skips)
                while True:
                    all_tasks = store.get_tasks_for_instance(instance.id)
                    satisfied_step_ids = {t.stepId for t in all_tasks if t.status in (StepStatus.COMPLETED, StepStatus.SKIPPED)}
                    executed_or_scheduled_ids = {t.stepId for t in all_tasks if t.status in (StepStatus.SCHEDULED, StepStatus.RUNNING, StepStatus.COMPLETED, StepStatus.SKIPPED)}

                    next_steps = DagEngine.get_ready_steps(wf.dag, satisfied_step_ids, executed_or_scheduled_ids)
                    if not next_steps:
                        break

                    advanced = False
                    for step in next_steps:
                        t = next((tk for tk in all_tasks if tk.stepId == step.id and tk.status == StepStatus.PENDING), None)
                        if not t:
                            continue

                        # Extract condition from step.condition or step.configurationJson
                        step_cond = getattr(step, "condition", None)
                        if not step_cond and step.configurationJson:
                            try:
                                cfg = json.loads(step.configurationJson)
                                step_cond = cfg.get("condition")
                            except Exception:
                                pass

                        # Merge input payload from instance input + all upstream dependencies
                        merged_input = dict(context)
                        for dep_id in step.dependsOn:
                            dep_task = next((dt for dt in all_tasks if dt.stepId == dep_id), None)
                            if dep_task and dep_task.outputPayloadJson:
                                try:
                                    dep_out = json.loads(dep_task.outputPayloadJson)
                                    if isinstance(dep_out, dict):
                                        merged_input.update(dep_out)
                                        merged_input[dep_id] = dep_out
                                except Exception:
                                    pass

                        # Evaluate condition
                        is_active = DagEngine.evaluate_condition(step_cond, context)
                        if is_active:
                            updated_next_task = t.model_copy(update={
                                "status": StepStatus.SCHEDULED,
                                "scheduledAt": now,
                                "updatedAt": now,
                                "inputPayloadJson": json.dumps(merged_input)
                            })
                            store.update_task(updated_next_task)
                            released_step_names.append(t.stepName)
                            advanced = True
                        else:
                            # Step is SKIPPED because condition evaluated to False
                            skip_out = json.dumps({
                                "status": "SKIPPED",
                                "reason": f"Condition '{step_cond}' evaluated to False",
                                "skippedAt": now.isoformat()
                            })
                            skipped_task = t.model_copy(update={
                                "status": StepStatus.SKIPPED,
                                "scheduledAt": now,
                                "startedAt": now,
                                "completedAt": now,
                                "updatedAt": now,
                                "outputPayloadJson": skip_out,
                                "inputPayloadJson": json.dumps(merged_input)
                            })
                            store.update_task(skipped_task)
                            context[step.id] = {"status": "SKIPPED"}
                            context["slackAlertStatus"] = "SKIPPED"
                            store.record_audit(
                                "SKIP",
                                "ORCHESTRATOR",
                                f"Task '{t.stepName}' was SKIPPED (Condition '{step_cond}' not met).",
                                user_id=None
                            )
                            released_step_names.append(f"{t.stepName} (SKIPPED)")
                            advanced = True  # Continue loop so join steps depending on this can unlock!

                    if not advanced:
                        break

                if released_step_names:
                    store.record_audit(
                        "DISPATCH",
                        "ORCHESTRATOR",
                        f"Task '{task.stepName}' completed. Resolved downstream steps: {', '.join(released_step_names)}",
                        user_id=None
                    )

                # 3. Check if all steps in DAG reached terminal state (COMPLETED or SKIPPED)
                all_tasks = store.get_tasks_for_instance(instance.id)
                terminal_count = sum(1 for t in all_tasks if t.status in (StepStatus.COMPLETED, StepStatus.SKIPPED))
                if terminal_count == len(wf.dag.steps):
                    store.update_instance(instance.model_copy(update={
                        "status": WorkflowStatus.COMPLETED,
                        "outputPayloadJson": json.dumps(context),
                        "completedAt": now,
                        "updatedAt": now,
                    }))

        return updated_task.model_copy(update={"releasedSteps": released_step_names})

    @staticmethod
    def fail_task(task_id: int, req: FailTaskRequest) -> TaskExecution:
        task = store.get_task(task_id)
        if not task:
            raise AppException.not_found(f"Task execution #{task_id}")

        now = datetime.now(timezone.utc)
        store.release_worker_slot(task.assignedWorkerId, completed=False)

        if req.canRetry and task.retryCount < task.maxRetries:
            retried = task.model_copy(update={
                "status": StepStatus.SCHEDULED,
                "retryCount": task.retryCount + 1,
                "errorMessage": req.errorMessage,
                "assignedWorkerId": None,
                "scheduledAt": now,
                "updatedAt": now,
                "attempt": task.retryCount + 2,
            })
            store.update_task(retried)
            return retried

        failed = task.model_copy(update={
            "status": StepStatus.FAILED,
            "errorMessage": req.errorMessage,
            "completedAt": now,
            "updatedAt": now,
        })
        store.update_task(failed)

        # Fail workflow instance
        instance = store.get_instance(task.instanceId)
        if instance and instance.status == WorkflowStatus.RUNNING:
            store.update_instance(instance.model_copy(update={
                "status": WorkflowStatus.FAILED,
                "errorMessage": f"Step '{task.stepName}' failed: {req.errorMessage}",
                "completedAt": now,
                "updatedAt": now,
            }))

        return failed
