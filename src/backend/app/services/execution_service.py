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

        # Discover root steps (0 dependencies)
        ready_steps = DagEngine.get_ready_steps(wf.dag, set(), set())
        created_tasks = []
        for step in ready_steps:
            task = TaskExecution(
                id=0,
                instanceId=created_instance.id,
                stepId=step.id,
                stepName=step.name,
                taskType=step.type,
                queueName=step.queue or "default",
                status=StepStatus.SCHEDULED,
                retryCount=0,
                maxRetries=step.maxRetries,
                inputPayloadJson=payload,
                outputPayloadJson=None,
                errorMessage=None,
                assignedWorkerId=None,
                scheduledAt=now,
                startedAt=None,
                completedAt=None,
                createdAt=now,
                updatedAt=now,
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

        # Advance DAG State Machine
        instance = store.get_instance(task.instanceId)
        if instance and instance.status == WorkflowStatus.RUNNING:
            wf = store.get_workflow(instance.workflowId)
            if wf:
                all_tasks = store.get_tasks_for_instance(instance.id)
                completed_step_ids = {t.stepId for t in all_tasks if t.status == StepStatus.COMPLETED}
                executed_step_ids = {t.stepId for t in all_tasks}

                next_steps = DagEngine.get_ready_steps(wf.dag, completed_step_ids, executed_step_ids)
                for step in next_steps:
                    new_task = TaskExecution(
                        id=0,
                        instanceId=instance.id,
                        stepId=step.id,
                        stepName=step.name,
                        taskType=step.type,
                        queueName=step.queue or "default",
                        status=StepStatus.SCHEDULED,
                        retryCount=0,
                        maxRetries=step.maxRetries,
                        inputPayloadJson=req.outputPayloadJson or instance.inputPayloadJson,
                        outputPayloadJson=None,
                        errorMessage=None,
                        assignedWorkerId=None,
                        scheduledAt=now,
                        startedAt=None,
                        completedAt=None,
                        createdAt=now,
                        updatedAt=now,
                    )
                    store.add_task(new_task)

                # Check if all steps in DAG completed
                if all(step.id in completed_step_ids for step in wf.dag.steps):
                    store.update_instance(instance.model_copy(update={
                        "status": WorkflowStatus.COMPLETED,
                        "outputPayloadJson": req.outputPayloadJson,
                        "completedAt": now,
                        "updatedAt": now,
                    }))

        return updated_task

    @staticmethod
    def fail_task(task_id: int, req: FailTaskRequest) -> TaskExecution:
        task = store.get_task(task_id)
        if not task:
            raise AppException.not_found(f"Task execution #{task_id}")

        now = datetime.now(timezone.utc)
        if req.canRetry and task.retryCount < task.maxRetries:
            retried = task.model_copy(update={
                "status": StepStatus.SCHEDULED,
                "retryCount": task.retryCount + 1,
                "errorMessage": req.errorMessage,
                "assignedWorkerId": None,
                "scheduledAt": now,
                "updatedAt": now,
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
