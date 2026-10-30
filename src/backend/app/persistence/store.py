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

        # Seed Workers (Dedicated Multi-Worker Pool by Queue)
        seed_workers = [
            ("worker-default-01", "node-01.orchestrator.cluster", ["default", "notification"], 4),
            ("worker-compute-01", "node-02.orchestrator.cluster", ["compute"], 4),
            ("worker-ai-01", "node-03.orchestrator.cluster", ["ai-agent"], 2),
            ("worker-data-01", "node-04.orchestrator.cluster", ["data-io"], 4),
            ("worker-payment-01", "node-05.orchestrator.cluster", ["payment", "inventory", "logistics", "documents"], 2),
            ("worker-node-compute-01", "legacy.orchestrator.cluster", ["default", "compute", "data-io", "payment", "ai-agent"], 16),
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

        # Load existing workflows, instances, and tasks from SQLite database
        try:
            import json
            from app.persistence.database import get_db_connection
            conn = get_db_connection()
            rows = conn.execute("SELECT id, name, version, description, dag_definition, is_active, created_by FROM workflow_definitions WHERE deleted_at IS NULL").fetchall()
            for r in rows:
                wf_id = r["id"]
                if wf_id not in self.workflows:
                    dag_data = json.loads(r["dag_definition"])
                    wf = WorkflowDefinition(
                        id=wf_id,
                        name=r["name"],
                        version=r["version"],
                        description=r["description"],
                        dag=DagDefinition(**dag_data),
                        isActive=bool(r["is_active"]),
                        createdBy=r["created_by"] or 1,
                        createdAt=now,
                        updatedAt=now,
                    )
                    self.workflows[wf_id] = wf
                    if wf_id > self._workflow_seq:
                        self._workflow_seq = wf_id

            def _parse_dt(val, default_val=None):
                if not val:
                    return default_val
                try:
                    s = str(val).replace(" ", "T")
                    dt = datetime.fromisoformat(s)
                    if dt.tzinfo is None:
                        dt = dt.replace(tzinfo=timezone.utc)
                    return dt
                except Exception:
                    return default_val

            inst_rows = conn.execute("SELECT * FROM workflow_instances ORDER BY id ASC").fetchall()
            for r in inst_rows:
                inst_id = r["id"]
                st_val = r["status"]
                try:
                    status_enum = WorkflowStatus(st_val)
                except Exception:
                    status_enum = WorkflowStatus.RUNNING

                inst = WorkflowInstance(
                    id=inst_id,
                    workflowId=r["workflow_id"],
                    workflowName=r["workflow_name"],
                    version=r["version"],
                    status=status_enum,
                    inputPayloadJson=r["input_payload"] or "{}",
                    outputPayloadJson=r["output_payload"],
                    contextDataJson=r["context_data"] or "{}",
                    errorMessage=r["error_message"],
                    triggeredBy=r["triggered_by"] or 1,
                    startedAt=_parse_dt(r["started_at"], now),
                    completedAt=_parse_dt(r["completed_at"], None),
                    createdAt=_parse_dt(r["created_at"], now),
                    updatedAt=_parse_dt(r["updated_at"], now),
                )
                self.instances[inst_id] = inst
                if inst_id > self._instance_seq:
                    self._instance_seq = inst_id

            task_rows = conn.execute("SELECT * FROM task_executions ORDER BY id ASC").fetchall()
            for tr in task_rows:
                t_id = tr["id"]
                try:
                    tt_enum = TaskType(tr["task_type"])
                except Exception:
                    tt_enum = TaskType.WORKER_TASK
                try:
                    step_st_enum = StepStatus(tr["status"])
                except Exception:
                    step_st_enum = StepStatus.PENDING

                task = TaskExecution(
                    id=t_id,
                    instanceId=tr["instance_id"],
                    stepId=tr["step_id"],
                    stepName=tr["step_name"],
                    taskType=tt_enum,
                    queueName=tr["queue_name"] or "default",
                    status=step_st_enum,
                    retryCount=tr["retry_count"] or 0,
                    maxRetries=tr["max_retries"] or 3,
                    timeoutSeconds=tr["timeout_seconds"] or 300,
                    inputPayloadJson=tr["input_payload"] or "{}",
                    outputPayloadJson=tr["output_payload"],
                    errorMessage=tr["error_message"],
                    assignedWorkerId=tr["assigned_worker_id"],
                    scheduledAt=_parse_dt(tr["scheduled_at"], None),
                    claimedAt=_parse_dt(tr["claimed_at"], None),
                    startedAt=_parse_dt(tr["started_at"], None),
                    completedAt=_parse_dt(tr["completed_at"], None),
                    createdAt=_parse_dt(tr["created_at"], now),
                    updatedAt=_parse_dt(tr["updated_at"], now),
                )
                self.tasks[t_id] = task
                if t_id > self._task_seq:
                    self._task_seq = t_id

            conn.close()
        except Exception:
            pass

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
            try:
                from app.persistence.database import get_db_connection
                conn = get_db_connection()
                conn.execute(
                    """
                    INSERT OR REPLACE INTO workflow_definitions (id, name, version, description, dag_definition, is_active, created_by, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
                    """,
                    (created.id, created.name, created.version, created.description, created.dag.model_dump_json(), 1 if created.isActive else 0, created.createdBy)
                )
                conn.commit()
                conn.close()
            except Exception as ex:
                pass
            return created

    def update_workflow(self, wf: WorkflowDefinition) -> None:
        with self._lock:
            self.workflows[wf.id] = wf
            try:
                from app.persistence.database import get_db_connection
                conn = get_db_connection()
                deleted_str = wf.deletedAt.isoformat() if wf.deletedAt else None
                conn.execute(
                    """
                    UPDATE workflow_definitions
                    SET name = ?, version = ?, description = ?, dag_definition = ?, is_active = ?, deleted_at = ?, updated_at = datetime('now')
                    WHERE id = ?
                    """,
                    (wf.name, wf.version, wf.description, wf.dag.model_dump_json(), 1 if wf.isActive else 0, deleted_str, wf.id)
                )
                conn.commit()
                conn.close()
            except Exception:
                pass

    # --- Executions & Tasks ---
    def add_instance(self, instance: WorkflowInstance) -> WorkflowInstance:
        with self._lock:
            self._instance_seq += 1
            created = instance.model_copy(update={"id": self._instance_seq})
            self.instances[created.id] = created
            try:
                from app.persistence.database import get_db_connection
                conn = get_db_connection()
                conn.execute(
                    """
                    INSERT OR REPLACE INTO workflow_instances (id, workflow_id, workflow_name, version, status, input_payload, output_payload, context_data, error_message, triggered_by, started_at, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'), datetime('now'))
                    """,
                    (created.id, created.workflowId, created.workflowName, created.version, created.status.value, created.inputPayloadJson, created.outputPayloadJson, created.contextDataJson, created.errorMessage, created.triggeredBy)
                )
                conn.commit()
                conn.close()
            except Exception:
                pass
            return created

    def get_instance(self, instance_id: int) -> Optional[WorkflowInstance]:
        with self._lock:
            return self.instances.get(instance_id)

    def update_instance(self, instance: WorkflowInstance) -> None:
        with self._lock:
            self.instances[instance.id] = instance
            try:
                from app.persistence.database import get_db_connection
                conn = get_db_connection()
                comp_str = instance.completedAt.isoformat() if instance.completedAt else None
                conn.execute(
                    """
                    UPDATE workflow_instances
                    SET status = ?, output_payload = ?, error_message = ?, completed_at = ?, updated_at = datetime('now')
                    WHERE id = ?
                    """,
                    (instance.status.value, instance.outputPayloadJson, instance.errorMessage, comp_str, instance.id)
                )
                conn.commit()
                conn.close()
            except Exception:
                pass

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
            try:
                from app.persistence.database import get_db_connection
                conn = get_db_connection()
                sched_str = created.scheduledAt.isoformat() if created.scheduledAt else None
                claimed_str = created.claimedAt.isoformat() if created.claimedAt else None
                started_str = created.startedAt.isoformat() if created.startedAt else None
                conn.execute(
                    """
                    INSERT OR REPLACE INTO task_executions (id, instance_id, step_id, step_name, task_type, queue_name, status, retry_count, max_retries, timeout_seconds, input_payload, output_payload, error_message, assigned_worker_id, scheduled_at, claimed_at, started_at, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
                    """,
                    (created.id, created.instanceId, created.stepId, created.stepName, created.taskType.value, created.queueName, created.status.value, created.retryCount, created.maxRetries, created.timeoutSeconds, created.inputPayloadJson, created.outputPayloadJson, created.errorMessage, created.assignedWorkerId, sched_str, claimed_str, started_str)
                )
                conn.commit()
                conn.close()
            except Exception:
                pass
            return created

    def get_task(self, task_id: int) -> Optional[TaskExecution]:
        with self._lock:
            return self.tasks.get(task_id)

    def update_task(self, task: TaskExecution) -> None:
        with self._lock:
            self.tasks[task.id] = task
            try:
                from app.persistence.database import get_db_connection
                conn = get_db_connection()
                comp_str = task.completedAt.isoformat() if task.completedAt else None
                claimed_str = task.claimedAt.isoformat() if task.claimedAt else None
                started_str = task.startedAt.isoformat() if task.startedAt else None
                sched_str = task.scheduledAt.isoformat() if task.scheduledAt else None
                conn.execute(
                    """
                    UPDATE task_executions
                    SET status = ?, output_payload = ?, error_message = ?, assigned_worker_id = ?, retry_count = ?, timeout_seconds = ?, scheduled_at = ?, claimed_at = ?, started_at = ?, completed_at = ?, updated_at = datetime('now')
                    WHERE id = ?
                    """,
                    (task.status.value, task.outputPayloadJson, task.errorMessage, task.assignedWorkerId, task.retryCount, task.timeoutSeconds, sched_str, claimed_str, started_str, comp_str, task.id)
                )
                conn.commit()
                conn.close()
            except Exception:
                pass

    def get_tasks_for_instance(self, instance_id: int) -> List[TaskExecution]:
        with self._lock:
            return sorted([t for t in self.tasks.values() if t.instanceId == instance_id], key=lambda x: x.id)

    def poll_scheduled_task(self, worker_id: str, queues: List[str]) -> Optional[TaskExecution]:
        with self._lock:
            # 1. Concurrency limit check
            worker = self.workers.get(worker_id)
            if worker and worker.currentLoad >= worker.maxConcurrency:
                return None

            allowed_queues = set(queues) if queues else {"default"}
            now = datetime.now(timezone.utc)
            now_iso = now.isoformat()

            # 2. Sort by scheduledAt, then id (Fair FIFO)
            candidates = [
                t for t in self.tasks.values()
                if t.status == StepStatus.SCHEDULED and t.queueName in allowed_queues
            ]
            candidates.sort(key=lambda x: (x.scheduledAt or now, x.id))

            for task in candidates:
                # 3. Atomic DB Compare-And-Swap
                claimed_db = False
                try:
                    from app.persistence.database import get_db_connection
                    conn = get_db_connection()
                    cur = conn.execute(
                        """
                        UPDATE task_executions
                        SET status = 'RUNNING', assigned_worker_id = ?, claimed_at = ?, started_at = ?, updated_at = ?
                        WHERE id = ? AND status = 'SCHEDULED'
                        """,
                        (worker_id, now_iso, now_iso, now_iso, task.id)
                    )
                    conn.commit()
                    claimed_db = (cur.rowcount == 1)
                    conn.close()
                except Exception:
                    claimed_db = True

                if not claimed_db:
                    continue

                # 4. Update memory store
                assigned = task.model_copy(update={
                    "status": StepStatus.RUNNING,
                    "assignedWorkerId": worker_id,
                    "claimedAt": now,
                    "startedAt": now,
                    "updatedAt": now,
                    "attempt": task.retryCount + 1,
                })
                self.tasks[assigned.id] = assigned

                # 5. Increment worker load & update status
                if worker:
                    new_load = worker.currentLoad + 1
                    new_status = WorkerStatus.BUSY if new_load >= worker.maxConcurrency else WorkerStatus.ONLINE
                    updated_worker = worker.model_copy(update={
                        "currentLoad": new_load,
                        "status": new_status,
                        "lastHeartbeatAt": now
                    })
                    self.workers[worker_id] = updated_worker
                    try:
                        from app.persistence.database import get_db_connection
                        conn = get_db_connection()
                        conn.execute(
                            "UPDATE worker_nodes SET current_load = ?, status = ?, last_heartbeat_at = ? WHERE worker_id = ?",
                            (new_load, new_status.value, now_iso, worker_id)
                        )
                        conn.commit()
                        conn.close()
                    except Exception:
                        pass

                return assigned

            return None

    def release_worker_slot(self, worker_id: Optional[str], completed: bool = False) -> None:
        if not worker_id:
            return
        with self._lock:
            now = datetime.now(timezone.utc)
            now_iso = now.isoformat()
            if worker_id in self.workers:
                w = self.workers[worker_id]
                new_load = max(0, w.currentLoad - 1)
                new_status = WorkerStatus.ONLINE if w.status == WorkerStatus.BUSY else w.status
                new_completed = getattr(w, "completedTasks", 0) + (1 if completed else 0)
                updated = w.model_copy(update={
                    "currentLoad": new_load,
                    "completedTasks": new_completed,
                    "status": new_status,
                })
                self.workers[worker_id] = updated
                try:
                    from app.persistence.database import get_db_connection
                    conn = get_db_connection()
                    conn.execute(
                        "UPDATE worker_nodes SET current_load = ?, status = ?, last_heartbeat_at = ? WHERE worker_id = ?",
                        (new_load, new_status.value, now_iso, worker_id)
                    )
                    conn.commit()
                    conn.close()
                except Exception:
                    pass

    def reclaim_stale_tasks(self, heartbeat_timeout_seconds: int = 45) -> dict:
        with self._lock:
            now = datetime.now(timezone.utc)
            offline_workers = set()

            # 1. Mark stale workers OFFLINE
            for w in self.workers.values():
                if w.status != WorkerStatus.OFFLINE:
                    diff = (now - w.lastHeartbeatAt).total_seconds()
                    if diff > heartbeat_timeout_seconds:
                        self.workers[w.workerId] = w.model_copy(update={"status": WorkerStatus.OFFLINE, "currentLoad": 0})
                        offline_workers.add(w.workerId)
                        try:
                            from app.persistence.database import get_db_connection
                            conn = get_db_connection()
                            conn.execute("UPDATE worker_nodes SET status = 'OFFLINE', current_load = 0 WHERE worker_id = ?", (w.workerId,))
                            conn.commit()
                            conn.close()
                        except Exception:
                            pass

            reclaimed_count = 0
            # 2. Check running tasks for dead worker or timeout
            for task in list(self.tasks.values()):
                if task.status == StepStatus.RUNNING:
                    is_worker_dead = task.assignedWorkerId in offline_workers
                    is_timed_out = False
                    if task.startedAt:
                        run_duration = (now - task.startedAt).total_seconds()
                        if run_duration > (task.timeoutSeconds or 300):
                            is_timed_out = True

                    if is_worker_dead or is_timed_out:
                        reason = "worker offline" if is_worker_dead else f"execution timed out after {task.timeoutSeconds}s"
                        if task.retryCount < task.maxRetries:
                            rescheduled = task.model_copy(update={
                                "status": StepStatus.SCHEDULED,
                                "retryCount": task.retryCount + 1,
                                "assignedWorkerId": None,
                                "errorMessage": f"Auto-reclaimed: {reason}",
                                "scheduledAt": now,
                                "updatedAt": now,
                            })
                            self.tasks[rescheduled.id] = rescheduled
                            reclaimed_count += 1
                            self.record_audit("RETRY", "TASK", f"Reclaimed task #{task.id} '{task.stepName}' ({reason}) -> Rescheduled (attempt {rescheduled.retryCount + 1}/{task.maxRetries})")
                        else:
                            failed = task.model_copy(update={
                                "status": StepStatus.FAILED,
                                "errorMessage": f"Failed after {task.maxRetries} attempts ({reason})",
                                "completedAt": now,
                                "updatedAt": now,
                            })
                            self.tasks[failed.id] = failed
                            self.record_audit("FAIL", "TASK", f"Task #{task.id} '{task.stepName}' failed: exhausted retries ({reason})")
                            inst = self.instances.get(task.instanceId)
                            if inst and inst.status == WorkflowStatus.RUNNING:
                                self.update_instance(inst.model_copy(update={
                                    "status": WorkflowStatus.FAILED,
                                    "errorMessage": f"Task '{task.stepName}' failed: {reason}",
                                    "completedAt": now,
                                    "updatedAt": now
                                }))

            return {
                "offlineWorkersCount": len(offline_workers),
                "reclaimedTasksCount": reclaimed_count
            }

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
            try:
                from app.persistence.database import get_db_connection
                conn = get_db_connection()
                conn.execute(
                    """
                    INSERT INTO audit_logs (id, actor_user_id, action, module, detail, created_at)
                    VALUES (?, ?, ?, ?, ?, datetime('now'))
                    """,
                    (log.id, user_id, action, module, detail)
                )
                conn.commit()
                conn.close()
            except Exception:
                pass

store = InMemoryStore()
