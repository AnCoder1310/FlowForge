import threading
from datetime import datetime, timezone
from typing import Dict, List, Optional, Tuple
from app.core.security import PasswordService
from app.domain.models import (
    AuditLog,
    DagDefinition,
    DagStep,
    OrchestratorMetrics,
    SafeUser,
    StepStatus,
    TaskExecution,
    TaskType,
    UserAccount,
    UserRole,
    WorkerNode,
    WorkerStatus,
    WorkflowDefinition,
    WorkflowInstance,
    WorkflowStatus,
)

class InMemoryStore:
    def __init__(self):
        self._lock = threading.RLock()
        self._user_seq = 0
        self._workflow_seq = 0
        self._instance_seq = 0
        self._task_seq = 0
        self._worker_seq = 0
        self._audit_seq = 0

        self.users: Dict[int, UserAccount] = {}
        self.workflows: Dict[int, WorkflowDefinition] = {}
        self.instances: Dict[int, WorkflowInstance] = {}
        self.tasks: Dict[int, TaskExecution] = {}
        self.workers: Dict[str, WorkerNode] = {}
        self.audits: List[AuditLog] = []

        self._seed_data()

    def _seed_data(self):
        now = datetime.now(timezone.utc)
        pwd_hash = PasswordService.hash_password("ChangeMe123!")

        # Seed Users
        seed_users = [
            ("admin", "admin@orchestrator.local", "Platform Administrator", UserRole.ADMIN),
            ("operator", "operator@orchestrator.local", "Operations Lead", UserRole.OPERATOR),
            ("dev", "dev@orchestrator.local", "Workflow Developer", UserRole.DEVELOPER),
            ("viewer", "viewer@orchestrator.local", "Platform Observer", UserRole.VIEWER),
        ]
        for uname, email, fname, role in seed_users:
            self._user_seq += 1
            self.users[self._user_seq] = UserAccount(
                id=self._user_seq,
                username=uname,
                email=email,
                passwordHash=pwd_hash,
                fullName=fname,
                role=role,
                isActive=True,
                createdAt=now,
                updatedAt=now,
            )

        # Seed Workflows
        etl_dag = DagDefinition(
            steps=[
                DagStep(id="step-extract", name="Extract from Data Lake", type=TaskType.WORKER_TASK, queue="data-io", dependsOn=[], maxRetries=3, timeoutSeconds=300),
                DagStep(id="step-transform", name="Transform & Cleanse", type=TaskType.WORKER_TASK, queue="compute", dependsOn=["step-extract"], maxRetries=2, timeoutSeconds=600),
                DagStep(id="step-enrich", name="ML Feature Enrichment", type=TaskType.WORKER_TASK, queue="ml-worker", dependsOn=["step-transform"], maxRetries=2, timeoutSeconds=900),
                DagStep(id="step-load", name="Load to Warehouse", type=TaskType.WORKER_TASK, queue="data-io", dependsOn=["step-enrich"], maxRetries=3, timeoutSeconds=300),
                DagStep(id="step-notify", name="Send Webhook Alert", type=TaskType.HTTP_TASK, queue="default", dependsOn=["step-load"], maxRetries=1, timeoutSeconds=30),
            ]
        )
        self._workflow_seq += 1
        self.workflows[self._workflow_seq] = WorkflowDefinition(
            id=self._workflow_seq,
            name="Data-ETL-Pipeline",
            version=1,
            description="Distributed batch extract, transform, validate, and load pipeline across multiple workers.",
            dag=etl_dag,
            isActive=True,
            createdBy=1,
            createdAt=now,
            updatedAt=now,
        )

        saga_dag = DagDefinition(
            steps=[
                DagStep(id="step-validate-fraud", name="Fraud & Risk Assessment", type=TaskType.HTTP_TASK, queue="default", dependsOn=[], maxRetries=2, timeoutSeconds=15),
                DagStep(id="step-charge-card", name="Charge Customer Card", type=TaskType.WORKER_TASK, queue="payment", dependsOn=["step-validate-fraud"], maxRetries=3, timeoutSeconds=30),
                DagStep(id="step-reserve-stock", name="Reserve Warehouse Stock", type=TaskType.WORKER_TASK, queue="inventory", dependsOn=["step-charge-card"], maxRetries=3, timeoutSeconds=60),
                DagStep(id="step-create-invoice", name="Generate PDF Invoice", type=TaskType.WORKER_TASK, queue="documents", dependsOn=["step-reserve-stock"], maxRetries=2, timeoutSeconds=45),
                DagStep(id="step-dispatch", name="Notify Shipping Carrier", type=TaskType.WORKER_TASK, queue="logistics", dependsOn=["step-reserve-stock"], maxRetries=3, timeoutSeconds=60),
            ]
        )
        self._workflow_seq += 1
        self.workflows[self._workflow_seq] = WorkflowDefinition(
            id=self._workflow_seq,
            name="Order-Fulfillment-Saga",
            version=1,
            description="Distributed e-commerce order saga: payment validation, inventory allocation, shipment dispatch.",
            dag=saga_dag,
            isActive=True,
            createdBy=1,
            createdAt=now,
            updatedAt=now,
        )

        # Seed Workers
        seed_workers = [
            ("worker-node-compute-01", "node-01.orchestrator.cluster", ["default", "compute", "data-io"], 16),
            ("worker-node-compute-02", "node-02.orchestrator.cluster", ["default", "compute", "ml-worker"], 16),
            ("worker-node-payments-01", "node-03.orchestrator.cluster", ["payment", "inventory", "logistics"], 8),
        ]
        for wid, host, queues, max_c in seed_workers:
            self._worker_seq += 1
            self.workers[wid] = WorkerNode(
                id=self._worker_seq,
                workerId=wid,
                hostname=host,
                status=WorkerStatus.ONLINE,
                supportedQueues=queues,
                currentLoad=0,
                maxConcurrency=max_c,
                lastHeartbeatAt=now,
                registeredAt=now,
            )

    # --- Users ---
    def find_user_by_email(self, email: str) -> Optional[UserAccount]:
        with self._lock:
            for u in self.users.values():
                if u.email.lower() == email.strip().lower():
                    return u
            return None

    def get_user_by_id(self, user_id: int) -> Optional[UserAccount]:
        with self._lock:
            return self.users.get(user_id)

    # --- Workflows ---
    def list_workflows(self, search: Optional[str] = None, is_active: Optional[bool] = None) -> List[WorkflowDefinition]:
        with self._lock:
            res = [w for w in self.workflows.values() if w.deletedAt is None]
            if search:
                s = search.lower().strip()
                res = [w for w in res if s in w.name.lower() or (w.description and s in w.description.lower())]
            if is_active is not None:
                res = [w for w in res if w.isActive == is_active]
            return sorted(res, key=lambda x: x.id, reverse=True)

    def get_workflow(self, workflow_id: int) -> Optional[WorkflowDefinition]:
        with self._lock:
            w = self.workflows.get(workflow_id)
            return w if w and w.deletedAt is None else None

    def add_workflow(self, wf: WorkflowDefinition) -> WorkflowDefinition:
        with self._lock:
            self._workflow_seq += 1
            created = wf.model_copy(update={"id": self._workflow_seq})
            self.workflows[created.id] = created
            return created

    def update_workflow(self, wf: WorkflowDefinition) -> None:
        with self._lock:
            self.workflows[wf.id] = wf

    # --- Executions & Tasks ---
    def add_instance(self, instance: WorkflowInstance) -> WorkflowInstance:
        with self._lock:
            self._instance_seq += 1
            created = instance.model_copy(update={"id": self._instance_seq})
            self.instances[created.id] = created
            return created

    def get_instance(self, instance_id: int) -> Optional[WorkflowInstance]:
        with self._lock:
            return self.instances.get(instance_id)

    def update_instance(self, instance: WorkflowInstance) -> None:
        with self._lock:
            self.instances[instance.id] = instance

    def list_instances(
        self,
        workflow_id: Optional[int] = None,
        status: Optional[WorkflowStatus] = None,
        search: Optional[str] = None
    ) -> List[WorkflowInstance]:
        with self._lock:
            res = list(self.instances.values())
            if workflow_id:
                res = [i for i in res if i.workflowId == workflow_id]
            if status:
                res = [i for i in res if i.status == status]
            if search:
                s = search.lower().strip()
                res = [i for i in res if s in i.workflowName.lower()]
            return sorted(res, key=lambda x: x.id, reverse=True)

    def add_task(self, task: TaskExecution) -> TaskExecution:
        with self._lock:
            self._task_seq += 1
            created = task.model_copy(update={"id": self._task_seq})
            self.tasks[created.id] = created
            return created

    def get_task(self, task_id: int) -> Optional[TaskExecution]:
        with self._lock:
            return self.tasks.get(task_id)

    def update_task(self, task: TaskExecution) -> None:
        with self._lock:
            self.tasks[task.id] = task

    def get_tasks_for_instance(self, instance_id: int) -> List[TaskExecution]:
        with self._lock:
            return sorted([t for t in self.tasks.values() if t.instanceId == instance_id], key=lambda x: x.id)

    def poll_scheduled_task(self, worker_id: str, queues: List[str]) -> Optional[TaskExecution]:
        with self._lock:
            allowed_queues = set(queues) if queues else {"default"}
            now = datetime.now(timezone.utc)
            for task in self.tasks.values():
                if task.status == StepStatus.SCHEDULED and task.queueName in allowed_queues:
                    assigned = task.model_copy(update={
                        "status": StepStatus.RUNNING,
                        "assignedWorkerId": worker_id,
                        "startedAt": now,
                        "updatedAt": now
                    })
                    self.tasks[assigned.id] = assigned
                    return assigned
            return None

    # --- Workers ---
    def upsert_worker(self, worker: WorkerNode) -> WorkerNode:
        with self._lock:
            if worker.workerId in self.workers:
                existing = self.workers[worker.workerId]
                updated = worker.model_copy(update={"id": existing.id})
                self.workers[worker.workerId] = updated
                return updated
            self._worker_seq += 1
            created = worker.model_copy(update={"id": self._worker_seq})
            self.workers[worker.workerId] = created
            return created

    def record_heartbeat(self, worker_id: str) -> None:
        with self._lock:
            now = datetime.now(timezone.utc)
            if worker_id in self.workers:
                w = self.workers[worker_id]
                self.workers[worker_id] = w.model_copy(update={
                    "lastHeartbeatAt": now,
                    "status": WorkerStatus.ONLINE
                })

    def list_workers(self) -> List[WorkerNode]:
        with self._lock:
            return list(self.workers.values())

    # --- Metrics ---
    def get_metrics(self) -> OrchestratorMetrics:
        with self._lock:
            total_wf = len([w for w in self.workflows.values() if w.deletedAt is None])
            active_wf = len([w for w in self.workflows.values() if w.deletedAt is None and w.isActive])
            running_inst = len([i for i in self.instances.values() if i.status == WorkflowStatus.RUNNING])
            comp_inst = len([i for i in self.instances.values() if i.status == WorkflowStatus.COMPLETED])
            failed_inst = len([i for i in self.instances.values() if i.status == WorkflowStatus.FAILED])
            pending_tasks = len([t for t in self.tasks.values() if t.status in (StepStatus.PENDING, StepStatus.SCHEDULED)])
            online_workers = len([w for w in self.workers.values() if w.status == WorkerStatus.ONLINE])

            return OrchestratorMetrics(
                totalWorkflows=total_wf,
                activeWorkflows=active_wf,
                runningInstances=running_inst,
                completedInstances=comp_inst,
                failedInstances=failed_inst,
                pendingTasks=pending_tasks,
                activeWorkers=online_workers,
            )

    # --- Audit ---
    def record_audit(self, action: str, module: str, detail: str, user_id: Optional[int] = None, metadata: Optional[str] = None):
        with self._lock:
            self._audit_seq += 1
            log = AuditLog(
                id=self._audit_seq,
                action=action,
                module=module,
                detail=detail,
                actorUserId=user_id,
                createdAt=datetime.now(timezone.utc),
                metadata=metadata
            )
            self.audits.append(log)

store = InMemoryStore()
