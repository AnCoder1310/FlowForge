from fastapi import APIRouter
from app.api.routes import ai, audit, auth, executions, metrics, profile, tasks, users, workers, workflows

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(workflows.router)
api_router.include_router(executions.router)
api_router.include_router(tasks.router)
api_router.include_router(workers.router)
api_router.include_router(metrics.router)
api_router.include_router(ai.router)
api_router.include_router(users.router)
api_router.include_router(profile.router)
api_router.include_router(audit.router)
