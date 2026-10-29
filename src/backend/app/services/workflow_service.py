from datetime import datetime, timezone
from typing import List, Optional
from app.core.exceptions import AppException
from app.domain.dag_engine import DagEngine
from app.domain.models import CreateWorkflowRequest, UpdateWorkflowRequest, UserAccount, UserRole, WorkflowDefinition
from app.persistence.store import store

class WorkflowService:
    @staticmethod
    def list_workflows(search: Optional[str] = None, is_active: Optional[bool] = None, page: int = 1, page_size: int = 20) -> dict:
        all_items = store.list_workflows(search=search, is_active=is_active)
        total = len(all_items)
        start = (page - 1) * page_size
        items = all_items[start : start + page_size]
        total_pages = (total + page_size - 1) // page_size if page_size > 0 else 0
        return {
            "items": items,
            "page": page,
            "pageSize": page_size,
            "totalItems": total,
            "totalPages": total_pages,
        }

    @staticmethod
    def get_workflow(workflow_id: int) -> WorkflowDefinition:
        wf = store.get_workflow(workflow_id)
        if not wf:
            raise AppException.not_found(f"Workflow definition #{workflow_id}")
        return wf

    @staticmethod
    def create_workflow(req: CreateWorkflowRequest, user: UserAccount) -> WorkflowDefinition:
        if user.role not in (UserRole.ADMIN, UserRole.OPERATOR, UserRole.DEVELOPER):
            raise AppException.forbidden("Insufficient role to create workflow.")

        if not req.name or not req.name.strip():
            raise AppException.validation("Workflow name is required.")

        DagEngine.validate_dag(req.dag)

        now = datetime.now(timezone.utc)
        wf = WorkflowDefinition(
            id=0,
            name=req.name.strip(),
            version=1,
            description=req.description.strip() if req.description else None,
            dag=req.dag,
            isActive=True,
            createdBy=user.id,
            createdAt=now,
            updatedAt=now,
        )
        created = store.add_workflow(wf)
        store.record_audit("CREATE", "WORKFLOW", f"Created workflow '{created.name}' v{created.version}", user.id)
        return created

    @staticmethod
    def update_workflow(workflow_id: int, req: UpdateWorkflowRequest, user: UserAccount) -> WorkflowDefinition:
        if user.role not in (UserRole.ADMIN, UserRole.OPERATOR, UserRole.DEVELOPER):
            raise AppException.forbidden("Insufficient role to update workflow.")

        wf = store.get_workflow(workflow_id)
        if not wf:
            raise AppException.not_found(f"Workflow definition #{workflow_id}")

        updated_dag = wf.dag
        if req.dag is not None:
            DagEngine.validate_dag(req.dag)
            updated_dag = req.dag

        now = datetime.now(timezone.utc)
        updated = wf.model_copy(update={
            "description": req.description.strip() if req.description is not None else wf.description,
            "dag": updated_dag,
            "isActive": req.isActive if req.isActive is not None else wf.isActive,
            "updatedAt": now,
        })
        store.update_workflow(updated)
        store.record_audit("UPDATE", "WORKFLOW", f"Updated workflow '{updated.name}' v{updated.version}", user.id)
        return updated

    @staticmethod
    def delete_workflow(workflow_id: int, user: UserAccount) -> None:
        if user.role not in (UserRole.ADMIN, UserRole.OPERATOR):
            raise AppException.forbidden("Only Admin or Operator can delete a workflow.")

        wf = store.get_workflow(workflow_id)
        if not wf:
            raise AppException.not_found(f"Workflow definition #{workflow_id}")

        now = datetime.now(timezone.utc)
        soft_deleted = wf.model_copy(update={"deletedAt": now, "isActive": False})
        store.update_workflow(soft_deleted)
        store.record_audit("DELETE", "WORKFLOW", f"Deleted workflow definition #{workflow_id}", user.id)
