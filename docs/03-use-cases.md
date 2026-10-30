# Actors, roles, and use cases — FlowForge DWOP

> Design status: TARGET V2 (Production-Ready)  
> Implementation status: FULL BASELINE IMPLEMENTED (FastAPI + React Console + Distributed Worker Daemon)

Product name: **FlowForge — Distributed Workflow Orchestration Platform (DWOP)**.

---

## 1. Actors / roles

| Role | Display name in UI | Primary Responsibility |
|---|---|---|
| `ADMIN` | Administrator | Full cluster governance, user RBAC management, audit log inspection, and configuration. |
| `OPERATOR` | Operations Lead | Day-to-day operations: triggers workflow executions, cancels runaway runs, monitors worker loads, and executes AI failure diagnostics. |
| `DEVELOPER` | Workflow Developer | Designs workflow DAG schemas, tests dependencies, uses AI Prompt-to-DAG generation, and triggers test executions. |
| `VIEWER` | Platform Observer | Read-only access: inspects cluster telemetry, active runs, worker nodes, and task queue distributions. |

---

## 2. Role × feature matrix

| Capability | Administrator | Operations Lead | Workflow Developer | Platform Observer |
|---|---|---|---|---|
| Cluster Dashboard & Telemetry | ✓ | ✓ | ✓ | ✓ |
| View Workflow DAGs & Studio | ✓ | ✓ | ✓ | ✓ |
| Define & Edit Workflow DAG (Canvas / JSON) | ✓ | ✓ | ✓ | |
| AI Prompt-to-DAG Generator | ✓ | | ✓ | |
| Trigger Workflow Run | ✓ | ✓ | ✓ | |
| View Real-time Step Timeline & SKIPPED States | ✓ | ✓ | ✓ | ✓ |
| Cancel Running Execution | ✓ | ✓ | | |
| AI Failure Diagnostics (Self-Healing) | ✓ | ✓ | ✓ | |
| Monitor Workers & Task Queues (5 Queues) | ✓ | ✓ | ✓ | ✓ |
| Activity Audit Log | ✓ | ✓ | | |
| Manage Users & Roles (RBAC) | ✓ | | | |
| Personal Profile & Credentials | ✓ | ✓ | ✓ | ✓ |

Menus and action buttons are **not displayed** in the UI when the user lacks permission. Unauthorized URL navigation resolves to the `#/403` (Forbidden) screen.

---

## 3. Use Case Diagram

Every use case is modeled as a discrete system capability within the FlowForge DWOP boundary. Administrator and Operations Lead are placed on the left; Workflow Developer and Platform Observer are placed on the right.

```mermaid
flowchart TB
    subgraph actors["System Actors"]
        direction LR
        admin(["Administrator"]):::actorPill
        operator(["Operations Lead"]):::actorPill
        dev(["Workflow Developer"]):::actorPill
        viewer(["Platform Observer"]):::actorPill
    end

    subgraph dwopBoundary["FlowForge — System Boundary (Role-Based Use Case Allocation)"]
        direction LR

        cardAdmin["<b>Administrator</b><br/><br/>• <b>UC01</b> Login (PBKDF2 + Demo)<br/>• <b>UC02</b> Logout<br/>• <b>UC03</b> View Dashboard & Telemetry<br/>• <b>UC04</b> View Workflow DAGs & Studio<br/>• <b>UC05</b> Define DAG & Conditions<br/>• <b>UC06</b> 9Router AI Prompt-to-DAG<br/>• <b>UC07</b> Trigger Workflow Run<br/>• <b>UC08</b> Track Step Progress & SKIPPED<br/>• <b>UC09</b> Cancel Execution Run<br/>• <b>UC10</b> AI Failure Diagnostics<br/>• <b>UC11</b> Monitor Workers & 5 Queues<br/>• <b>UC12</b> Security Audit Trail<br/>• <b>UC13</b> Profile & Password Self-Service<br/>• <b>UC14</b> Manage Users & RBAC Matrix"]:::colCard

        cardOp["<b>Operations Lead</b><br/><br/>• <b>UC01</b> Login (PBKDF2 + Demo)<br/>• <b>UC02</b> Logout<br/>• <b>UC03</b> View Dashboard & Telemetry<br/>• <b>UC04</b> View Workflow DAGs & Studio<br/>• <b>UC05</b> Define DAG & Conditions<br/>• <b>UC07</b> Trigger Workflow Run<br/>• <b>UC08</b> Track Step Progress & SKIPPED<br/>• <b>UC09</b> Cancel Execution Run<br/>• <b>UC10</b> AI Failure Diagnostics<br/>• <b>UC11</b> Monitor Workers & 5 Queues<br/>• <b>UC12</b> Security Audit Trail<br/>• <b>UC13</b> Profile & Password Self-Service"]:::colCard

        cardDev["<b>Workflow Developer</b><br/><br/>• <b>UC01</b> Login (PBKDF2 + Demo)<br/>• <b>UC02</b> Logout<br/>• <b>UC03</b> View Dashboard & Telemetry<br/>• <b>UC04</b> View Workflow DAGs & Studio<br/>• <b>UC05</b> Define DAG & Conditions<br/>• <b>UC06</b> 9Router AI Prompt-to-DAG<br/>• <b>UC07</b> Trigger Workflow Run<br/>• <b>UC08</b> Track Step Progress & SKIPPED<br/>• <b>UC10</b> AI Failure Diagnostics<br/>• <b>UC11</b> Monitor Workers & 5 Queues<br/>• <b>UC13</b> Profile & Password Self-Service"]:::colCard

        cardViewer["<b>Platform Observer</b><br/><br/>• <b>UC01</b> Login (PBKDF2 + Demo)<br/>• <b>UC02</b> Logout<br/>• <b>UC03</b> View Dashboard & Telemetry<br/>• <b>UC04</b> View Workflow DAGs (Read-only)<br/>• <b>UC08</b> Track Step Progress (Read-only)<br/>• <b>UC11</b> Monitor Workers & Queues (Read-only)<br/>• <b>UC13</b> Profile & Password Self-Service"]:::colCard
    end

    admin --> cardAdmin
    operator --> cardOp
    dev --> cardDev
    viewer --> cardViewer

    classDef actorPill fill:#334155,color:#ffffff,stroke:#64748b,stroke-width:2px;
    classDef colCard fill:#1d4ed8,color:#ffffff,stroke:#60a5fa,stroke-width:2px;
```

---

## 4. Shared Rules and Constraints

```mermaid
flowchart LR
    auth["Authenticate Session (HMAC Bearer)"]:::shared
    rbac["Authorize RBAC Role"]:::shared
    cycleCheck["Kahn Cycle Validation (0-Cycle)"]:::rule
    conditionEval["Conditional Branching & SKIPPED Cascade"]:::rule
    stateTransition["Atomic State Machine Transition"]:::rule
    queueRoute["Isolate Worker Queue (5 Queues)"]:::rule
    idempotentKey["Idempotency Key Preservation"]:::rule
    audit["Write Immutable Audit Trail"]:::shared

    createDag["Define Workflow DAG"] --> auth
    createDag --> rbac
    createDag --> cycleCheck
    createDag --> audit

    triggerRun["Trigger Workflow Run"] --> auth
    triggerRun --> rbac
    triggerRun --> stateTransition
    triggerRun --> queueRoute
    triggerRun --> conditionEval
    triggerRun --> idempotentKey
    triggerRun --> audit

    cancelRun["Cancel Running Execution"] --> auth
    cancelRun --> rbac
    cancelRun --> stateTransition
    cancelRun --> audit

    classDef shared fill:#1168bd,color:#fff,stroke:#0b4884
    classDef rule fill:#e8f1fc,color:#123,stroke:#3a7bd5
```

- **Cycle Invariant:** Any DAG submission with circular dependencies (`A -> B -> A`) is deterministically rejected by Kahn's algorithm before persistence.
- **Queue Isolation:** Worker task dispatching is strictly partition-based across 5 dedicated queues (`default`, `compute`, `data-io`, `payment`, `ai-agent`).
- **Conditional Branching & SKIPPED State:** Tasks with unsatisfied conditions are marked `SKIPPED`, unblocking downstream join steps without terminating or failing the workflow.
- **Idempotency Guarantee:** Retried external side-effect tasks (e.g. Slack alerts, card charges) reuse the unique `X-Idempotency-Key` to prevent duplicate operations.

---

## 5. Detailed Use Cases

### UC01 Login
- **Actor:** All roles (`ADMIN`, `OPERATOR`, `DEVELOPER`, `VIEWER`).
- **Preconditions:** Active user account exists with PBKDF2 password hash.
- **Main flow:** Enter email and password (or select one-click demo pill) → Submit login → Backend verifies PBKDF2 hash → Generates stateless HMAC-SHA256 Bearer access token → Writes `LOGIN` audit record → Redirects to Dashboard.
- **Alternative:** Invalid credentials → Returns `401 Unauthorized` with Problem Details (`AUTH_INVALID_CREDENTIALS`).
- **Permission:** Public (`/api/v1/auth/login`).
- **Result:** Authenticated session established with Bearer token stored in client storage.

### UC02 Logout
- **Actor:** All roles.
- **Preconditions:** Client is authenticated.
- **Main flow:** Click user menu → Select "Đăng xuất" → Discard Bearer token and session from client storage → Redirects to Login screen.
- **Permission:** Authenticated.
- **Result:** Protected routes are no longer accessible without re-authenticating.

### UC03 View Dashboard & Telemetry
- **Actor:** All roles.
- **Preconditions:** User is logged in.
- **Main flow:** View 4 live KPI cards (Total Workflows, Running Instances, Active Workers, Success Rate) → Inspect cluster telemetry (Kahn scheduling, queue isolation, SPOF-free indicators) → Inspect real-time depth across the 5 task queues → Inspect recent executions table with live step progress bars.
- **Permission:** `dashboard`.
- **Result:** Live visibility into cluster operational health and task saturation.

### UC04 View Workflow DAGs & Studio
- **Actor:** All roles.
- **Main flow:** Navigate to `/workflows` → Review list of defined DAGs → Inspect visual mini-pipeline nodes with directed arrows and assigned queue tags → Open detail modal to review dependencies (`dependsOn`), timeout limits, conditions, and raw JSON schema → Optionally switch to `/workflows/studio` to view the graphical DAG canvas.
- **Permission:** `workflowRead`.
- **Result:** Read-only observers see full DAG topology and Kahn stages without mutation controls.

### UC05 Define Workflow DAG & Conditions
- **Actor:** Administrator, Operations Lead, Workflow Developer.
- **Main flow:** Open "Tạo Workflow Mới" modal or navigate to Visual Workflow Studio → Enter workflow name, description, and configure DAG steps (Tasks, dependsOn, queue, timeoutSeconds, maxRetries, condition expression) → Submit → Backend validates DAG via Kahn's algorithm → Checks for circular dependencies, duplicate IDs, and invalid dependencies → Persists in `workflow_definitions` → Records audit entry → Refreshes workflow list.
- **Alternative:** Cycle detected → Throws `400 Bad Request` (`CYCLE_DETECTED`).
- **Permission:** `workflowWrite`.
- **Result:** New acyclic workflow with conditional branching support is immediately available for triggering.

### UC06 AI Prompt-to-DAG Generator
- **Actor:** Administrator, Workflow Developer.
- **Main flow:** Open "AI Sinh Workflow (Prompt-to-DAG)" → Enter business description in natural language (or select sample prompts: ETL, Payment Saga, AI Customer Feedback) → AI Engine (9Router Copilot) decomposes business processes → Synthesizes complete DAG JSON with optimal queue routing, parallel branches, and retry policies → Pre-fills creation modal with AI reasoning note → User confirms and saves DAG.
- **Permission:** `workflowWrite`.
- **Result:** Multi-step DAG generated in seconds without manual JSON editing.

### UC07 Trigger Workflow Run
- **Actor:** Administrator, Operations Lead, Workflow Developer.
- **Main flow:** Select workflow → Click "Trigger Run" → Enter Input Payload (JSON) → Backend instantiates `workflow_instances` with status `RUNNING` → DAG Engine computes ready root steps (`dependsOn == []`) → Dispatches corresponding tasks to `task_executions` with status `SCHEDULED` → Emits `TRIGGER` audit log.
- **Permission:** `executionTrigger`.
- **Result:** New execution instance starts immediately and root step tasks become available for worker polling.

### UC08 Track Step Lifecycle & SKIPPED States
- **Actor:** All roles.
- **Main flow:** Navigate to `/executions` → Filter by status (`ALL`, `RUNNING`, `COMPLETED`, `FAILED`, `CANCELLED`) → Click execution row to open detailed slide-over → Inspect vertical timeline showing step status, assigned worker ID, queue name, and retry count → Observe real-time state changes (`SCHEDULED`, `RUNNING`, `COMPLETED`, `SKIPPED`, `FAILED`) → Verify that conditional steps evaluating to False transition to `SKIPPED` and automatically cascade to unblock downstream join tasks.
- **Permission:** `executionRead`.
- **Result:** Granular observability into distributed step lifecycle, parallel branching, and conditional routing.

### UC09 Cancel Execution
- **Actor:** Administrator, Operations Lead.
- **Main flow:** Inspect running execution (`status == RUNNING`) → Click "Hủy lượt chạy" → Confirm action → Backend transitions instance and all non-completed tasks to `CANCELLED` → Workers release concurrency slots → Writes `CANCEL` audit record.
- **Permission:** `executionCancel`.
- **Result:** Run terminates immediately, freeing up worker concurrency slots.

### UC10 AI Failure Diagnostics (Self-Healing)
- **Actor:** Administrator, Operations Lead, Workflow Developer.
- **Main flow:** Open failed execution (`status == FAILED`) → Click "AI Chẩn Đoán Lỗi" → AI Assistant inspects failure log, step context, and worker metrics → Returns diagnosis panel showing Root Cause, Severity (`HIGH`/`MEDIUM`), and actionable Self-Healing instructions → Option to retry failed steps with original context.
- **Permission:** `executionRead`.
- **Result:** Immediate incident triage without manual log spelunking.

### UC11 Monitor Workers & 5 Queues
- **Actor:** All roles.
- **Main flow:** Navigate to `/workers` → Inspect cluster-wide slot utilization percentage → Review individual worker cards (Online status, heartbeat timestamp, current load / max concurrency) → Inspect breakdown table for the 5 isolated task queues (`default`, `compute`, `data-io`, `payment`, `ai-agent`).
- **Permission:** `workerRead`.
- **Result:** Cluster hardware, worker heartbeat health, and task queue saturation visibility.

### UC12 View Audit Log & Traceability
- **Actor:** Administrator, Operations Lead.
- **Main flow:** Navigate to `/audit` → Filter immutable audit trail by action (`LOGIN`, `CREATE`, `TRIGGER`, `CANCEL`, `SKIP`, `RETRY`, `FAIL`), actor, or date range → Inspect actor identity, affected module, timestamp, and action description → Export audit trail for compliance.
- **Permission:** `auditRead`.
- **Result:** Full security and operational traceability for regulatory and SOC2 compliance.

### UC13 Personal Profile & Password
- **Actor:** All roles.
- **Main flow:** Navigate to `/profile` → Review account details, role pill, and unique user ID → Switch to "Bảo mật" tab to update password → Switch to "Vai trò & Quyền hạn" tab to inspect current RBAC permissions matrix.
- **Permission:** Authenticated.
- **Result:** Self-service profile management with immutable role restrictions.

### UC14 Manage Users & RBAC
- **Actor:** Administrator.
- **Main flow:** Navigate to `/users` → Filter by status (`All`, `Active`, `Disabled`) → Inspect user directory, assigned roles (`ADMIN`, `OPERATOR`, `DEVELOPER`, `VIEWER`), and last activity → Assign new roles or toggle account status.
- **Permission:** `userManagement`.
- **Result:** Centralized control over cluster identity, access privileges, and RBAC governance.
