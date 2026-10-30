from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

class UserRole(str, Enum):
    ADMIN = "ADMIN"
    OPERATOR = "OPERATOR"
    DEVELOPER = "DEVELOPER"
    VIEWER = "VIEWER"

class WorkflowStatus(str, Enum):
    PENDING = "PENDING"
    RUNNING = "RUNNING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"
    PAUSED = "PAUSED"

class StepStatus(str, Enum):
    PENDING = "PENDING"
    SCHEDULED = "SCHEDULED"
    RUNNING = "RUNNING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    SKIPPED = "SKIPPED"
    TIMED_OUT = "TIMED_OUT"

class TaskType(str, Enum):
    WORKER_TASK = "WORKER_TASK"
    HTTP_TASK = "HTTP_TASK"
    SYSTEM_TASK = "SYSTEM_TASK"
    DECISION = "DECISION"
    DELAY = "DELAY"
    AI_AGENT_TASK = "AI_AGENT_TASK"
    NOTIFICATION = "NOTIFICATION"

class WorkerStatus(str, Enum):
    ONLINE = "ONLINE"
    BUSY = "BUSY"
    OFFLINE = "OFFLINE"
    DRAINING = "DRAINING"

# --- DAG Definition ---
class DagStep(BaseModel):
    id: str
    name: str
    type: TaskType = TaskType.WORKER_TASK
    queue: str = "default"
    dependsOn: List[str] = Field(default_factory=list)
    maxRetries: int = 3
    timeoutSeconds: int = 300
    configurationJson: Optional[str] = None
    condition: Optional[str] = None

class DagDefinition(BaseModel):
    steps: List[DagStep]

# --- Workflow Schemas ---
class WorkflowDefinition(BaseModel):
    id: int
    name: str
    version: int = 1
    description: Optional[str] = None
    dag: DagDefinition
    isActive: bool = True
    createdBy: Optional[int] = None
    createdAt: datetime
    updatedAt: datetime
    deletedAt: Optional[datetime] = None

class CreateWorkflowRequest(BaseModel):
    name: str
    description: Optional[str] = None
    dag: DagDefinition

class UpdateWorkflowRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    dag: Optional[DagDefinition] = None
    isActive: Optional[bool] = None

# --- Execution Schemas ---
class TaskExecution(BaseModel):
    id: int
    instanceId: int
    stepId: str
    stepName: str
    taskType: TaskType = TaskType.WORKER_TASK
    queueName: str = "default"
    status: StepStatus = StepStatus.PENDING
    retryCount: int = 0
    maxRetries: int = 3
    timeoutSeconds: int = 300
    inputPayloadJson: str = "{}"
    outputPayloadJson: Optional[str] = None
    errorMessage: Optional[str] = None
    assignedWorkerId: Optional[str] = None
    scheduledAt: Optional[datetime] = None
    claimedAt: Optional[datetime] = None
    startedAt: Optional[datetime] = None
    completedAt: Optional[datetime] = None
    createdAt: datetime
    updatedAt: datetime
    attempt: int = 1
    releasedSteps: Optional[List[str]] = None
    condition: Optional[str] = None

class WorkflowInstance(BaseModel):
    id: int
    workflowId: int
    workflowName: str
    version: int
    status: WorkflowStatus = WorkflowStatus.PENDING
    inputPayloadJson: str = "{}"
    outputPayloadJson: Optional[str] = None
    contextDataJson: str = "{}"
    errorMessage: Optional[str] = None
    triggeredBy: Optional[int] = None
    startedAt: Optional[datetime] = None
    completedAt: Optional[datetime] = None
    createdAt: datetime
    updatedAt: datetime
    tasks: Optional[List[TaskExecution]] = None

class TriggerWorkflowRequest(BaseModel):
    inputPayloadJson: Optional[str] = "{}"

class CompleteTaskRequest(BaseModel):
    outputPayloadJson: Optional[str] = "{}"

class FailTaskRequest(BaseModel):
    errorMessage: str
    canRetry: bool = True

# --- Worker Schemas ---
class WorkerNode(BaseModel):
    id: int
    workerId: str
    hostname: str
    status: WorkerStatus = WorkerStatus.ONLINE
    supportedQueues: List[str] = Field(default_factory=lambda: ["default"])
    currentLoad: int = 0
    maxConcurrency: int = 10
    completedTasks: int = 0
    lastHeartbeatAt: datetime
    registeredAt: datetime

class RegisterWorkerRequest(BaseModel):
    workerId: str
    hostname: str
    supportedQueues: Optional[List[str]] = Field(default_factory=lambda: ["default"])
    maxConcurrency: int = 10

class PollTaskRequest(BaseModel):
    workerId: str
    queues: Optional[List[str]] = Field(default_factory=lambda: ["default"])

class PollTaskResponse(BaseModel):
    task: Optional[TaskExecution] = None
    instanceId: int = 0
    workflowName: str = ""

# --- Metrics ---
class OrchestratorMetrics(BaseModel):
    totalWorkflows: int
    activeWorkflows: int
    runningInstances: int
    completedInstances: int
    failedInstances: int
    pendingTasks: int
    activeWorkers: int

# --- User & Auth Schemas ---
class UserAccount(BaseModel):
    id: int
    username: str
    email: str
    passwordHash: str
    fullName: str
    phone: Optional[str] = None
    avatarUrl: Optional[str] = None
    timezone: str = "Asia/Ho_Chi_Minh"
    role: UserRole = UserRole.VIEWER
    isActive: bool = True
    createdAt: datetime
    updatedAt: datetime
    lastLoginAt: Optional[datetime] = None

class SafeUser(BaseModel):
    id: int
    username: str
    email: str
    fullName: str
    phone: Optional[str] = None
    timezone: str = "Asia/Ho_Chi_Minh"
    role: UserRole
    isActive: bool
    avatarUrl: Optional[str] = None
    lastLoginAt: Optional[datetime] = None
    createdAt: datetime
    updatedAt: datetime

class LoginRequest(BaseModel):
    email: str
    password: str

class LoginResult(BaseModel):
    accessToken: str
    tokenType: str = "Bearer"
    expiresAt: datetime
    user: SafeUser

class CreateUserRequest(BaseModel):
    username: str
    email: str
    password: str
    fullName: str
    phone: Optional[str] = None
    timezone: str = "Asia/Ho_Chi_Minh"
    role: UserRole
    isActive: bool = True
    avatarUrl: Optional[str] = None

class UpdateUserRequest(BaseModel):
    username: str
    email: str
    fullName: str
    phone: Optional[str] = None
    timezone: str = "Asia/Ho_Chi_Minh"
    role: UserRole
    isActive: bool
    avatarUrl: Optional[str] = None

class UpdateProfileRequest(BaseModel):
    fullName: str
    phone: Optional[str] = None
    timezone: str = "Asia/Ho_Chi_Minh"
    avatarUrl: Optional[str] = None

class ChangePasswordRequest(BaseModel):
    currentPassword: str
    newPassword: str

class AuditLog(BaseModel):
    id: int
    action: str
    module: str
    detail: str
    actorUserId: Optional[int] = None
    createdAt: datetime
    metadata: Optional[str] = None

# --- AI Integration Schemas ---
class AiGenerateWorkflowRequest(BaseModel):
    prompt: str

class AiGenerateWorkflowResponse(BaseModel):
    name: str
    description: str
    dag: DagDefinition
    reasoning: str

class AiDiagnoseFailureRequest(BaseModel):
    instanceId: int
    taskId: Optional[int] = None

class AiDiagnoseFailureResponse(BaseModel):
    rootCause: str
    suggestedFix: str
    severity: str
    autoFixable: bool
