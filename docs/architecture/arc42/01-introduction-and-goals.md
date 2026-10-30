# 1. Introduction and Goals

**FlowForge (Distributed Workflow Orchestration Platform - DWOP)** helps engineering and operations teams orchestrate complex, multi-step distributed workflows as Directed Acyclic Graphs (DAG), manage asynchronous task dispatch across isolated worker queues, automate failure self-healing with AI, and track end-to-end execution lifecycle and audit logs in one unified console.

## 1.1 Requirements Overview

### Problem Statement

In modern distributed systems and microservices architectures, business workflows span multiple services (ETL extraction, payment gateway calls, heavy compute, AI model inferences, and notifications). Direct peer-to-peer REST calls introduce:
- **Cascading Failures:** A failure in one service can leave transactions corrupted or unrecoverable.
- **Deadlocks and Cycles:** Undetected circular dependencies cause permanent lockups.
- **Lack of Observability:** No centralized view of which step is running, who owns it, or why it failed.
- **Queue Contention:** Heavy compute jobs starve fast I/O tasks when using a single shared queue.

### Business Goals (V1)

- Allow teams to define multi-step workflows as **Directed Acyclic Graphs (DAG)**.
- Guarantee **Zero-Cycle Deadlock Prevention** via Kahn's algorithm before saving any workflow.
- Manage execution lifecycles with a strict state machine (`PENDING`, `RUNNING`, `COMPLETED`, `FAILED`, `CANCELLED`).
- Provide **Queue Isolation** across 5 dedicated queues: `default`, `compute`, `data-io`, `payment`, `ai-agent`.
- Integrate **AI Copilot** for Prompt-to-DAG generation and automated root cause failure diagnosis.
- Enforce Role-Based Access Control (**RBAC**) across 4 roles with append-only audit logging.

### Functional Scope

| ID | Capability | Description |
|---|---|---|
| F01 | Authentication & Identity | Login, logout, PBKDF2 password hashing, HMAC-SHA256 Bearer tokens |
| F02 | Cluster Telemetry Dashboard | Active workflows, running instances, worker load, queue depths |
| F03 | Workflow DAG Management | DAG JSON creation, cycle validation (Kahn), step dependencies |
| F04 | AI Prompt-to-DAG | Natural language prompt translated into valid DAG JSON schema |
| F05 | Execution Dispatch Engine | Trigger instance, resolve root steps, state machine management |
| F06 | Step Progress Tracking | Real-time task execution progress, retry counter, timeouts |
| F07 | Emergency Cancellation | Admin/Operator cancel running executions and cascade-abort tasks |
| F08 | AI Failure Self-Healing | Automated error analysis, root cause discovery, and fix recommendations |
| F09 | Worker Fleet Management | Concurrency slots, periodic heartbeats, queue polling, offline detection |
| F10 | Audit Trail & RBAC | Immutable security logging and role-based action gating |

## 1.2 Quality Goals

| ID | Quality Goal | Rationale |
|---|---|---|
| **QG-1** | **Orchestration Correctness** | Kahn's algorithm strictly prevents circular dependencies; execution state transitions are atomic. |
| **QG-2** | **Queue Isolation** | High-load compute tasks cannot starve high-priority payment or I/O tasks. |
| **QG-3** | **Security & RBAC** | Strict role enforcement at the FastAPI backend boundary; append-only audit trail. |
| **QG-4** | **Observability & Self-Healing** | Real-time step progress visualizer and AI-driven root cause failure diagnostics. |
| **QG-5** | **Developer Usability** | Modern high-tech console with Dark/Light mode, interactive DAG views, and Swagger API. |

## 1.3 Stakeholders

| Stakeholder | Primary Responsibilities |
|---|---|
| **Administrator (`ADMIN`)** | Full cluster governance, user RBAC management, cluster settings, and audit logs. |
| **Operations Lead (`OPERATOR`)** | Triggers workflows, cancels runaway runs, monitors worker loads, runs AI diagnostics. |
| **Workflow Developer (`DEVELOPER`)** | Designs workflow DAG schemas, validates dependencies, uses AI Prompt-to-DAG. |
| **Platform Observer (`VIEWER`)** | Read-only inspection of cluster telemetry, active runs, worker nodes, and task queues. |
