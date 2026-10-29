from datetime import datetime, timezone
from typing import List, Optional
from app.core.exceptions import AppException
from app.domain.models import (
    OrchestratorMetrics,
    PollTaskRequest,
    PollTaskResponse,
    RegisterWorkerRequest,
    WorkerNode,
    WorkerStatus,
)
from app.persistence.store import store

class WorkerService:
    @staticmethod
    def register_worker(req: RegisterWorkerRequest) -> WorkerNode:
        if not req.workerId or not req.workerId.strip():
            raise AppException.validation("Worker ID is required.")

        now = datetime.now(timezone.utc)
        node = WorkerNode(
            id=0,
            workerId=req.workerId.strip(),
            hostname=req.hostname.strip() if req.hostname else "unknown",
            status=WorkerStatus.ONLINE,
            supportedQueues=req.supportedQueues or ["default"],
            currentLoad=0,
            maxConcurrency=req.maxConcurrency if req.maxConcurrency > 0 else 10,
            lastHeartbeatAt=now,
            registeredAt=now,
        )
        return store.upsert_worker(node)

    @staticmethod
    def record_heartbeat(worker_id: str) -> None:
        store.record_heartbeat(worker_id)

    @staticmethod
    def poll_task(req: PollTaskRequest) -> PollTaskResponse:
        store.record_heartbeat(req.workerId)
        task = store.poll_scheduled_task(req.workerId, req.queues or ["default"])
        if not task:
            return PollTaskResponse(task=None, instanceId=0, workflowName="")

        instance = store.get_instance(task.instanceId)
        return PollTaskResponse(
            task=task,
            instanceId=task.instanceId,
            workflowName=instance.workflowName if instance else ""
        )

    @staticmethod
    def list_workers() -> List[WorkerNode]:
        return store.list_workers()

    @staticmethod
    def get_metrics() -> OrchestratorMetrics:
        return store.get_metrics()
