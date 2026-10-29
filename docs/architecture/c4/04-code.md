# C4 Level 4 — Code — Two Core Engines

> **Purpose:** Zoom into the implementation details of the two most critical engines in the Distributed Workflow Orchestration Platform: Kahn's DAG Engine and the Execution State Machine & Worker Dispatcher.

---

## L4.1 Kahn's Algorithm DAG Engine

The DAG engine (`app/domain/dag_engine.py`) guarantees that no cyclic dependency or invalid flow can enter the orchestration system.

```mermaid
flowchart TB
    subgraph dagEngine["DAG Engine Module (app/domain/dag_engine.py)"]
        direction TB
        val["validate_dag(steps: List[StepDefinition])<br/><i>[Entry Function]</i><br/>Validates uniqueness, dependency targets, and cycle freedom"]
        inDeg["calculate_in_degrees(steps)<br/><i>[Helper Function]</i><br/>Computes in-degree count for each step node"]
        kahn["topological_sort_kahn(steps)<br/><i>[Algorithm Core]</i><br/>Applies Kahn's Algorithm using a Zero-In-Degree Queue"]
        ready["get_ready_steps(steps, completed_ids)<br/><i>[Runtime Resolver]</i><br/>Returns steps whose dependencies are 100% satisfied"]
        detect["CycleDetectedException<br/><i>[Domain Error]</i><br/>Raised with cycle path if remaining nodes > 0"]

        val --> inDeg
        val --> kahn
        kahn -.->|"If visited_count != total_nodes"| detect
        ready --> inDeg
    end

    service["WorkflowService<br/><i>[app/services/workflow_service.py]</i>"]
    execService["ExecutionService<br/><i>[app/services/execution_service.py]</i>"]

    service --> val
    execService --> ready

    style val fill:#1168bd,color:#fff
    style kahn fill:#0b4f9e,color:#fff
    style ready fill:#0b4f9e,color:#fff
    style detect fill:#d9534f,color:#fff
```

### Kahn's Algorithm Invariant
Given a workflow with $N$ step nodes:
1. Compute in-degree (number of prerequisites) for all $N$ steps.
2. Initialize queue $Q$ with all nodes having $\text{in-degree} = 0$.
3. While $Q$ is not empty: dequeue node $u$, increment `visited_count`, and for each node $v$ depending on $u$, decrement $\text{in-degree}(v)$. If $\text{in-degree}(v) == 0$, push $v$ to $Q$.
4. **Invariant:** If $\text{visited\_count} < N$, a closed cycle exists; the engine rejects the workflow immediately.

---

## L4.2 Execution State Machine & Worker Dispatcher

The execution engine manages asynchronous task dispatching across 5 isolated queues and orchestrates state transitions.

```mermaid
flowchart TB
    subgraph execState["Execution Engine (app/services/)"]
        direction TB
        subgraph stateMachine["ExecutionService (execution_service.py)"]
            trigger["trigger_workflow(workflow_id, input_payload)<br/><i>Creates instance & root tasks</i>"]
            advance["advance_execution(instance_id, completed_task_id)<br/><i>Resolves downstream dependencies via DAG engine</i>"]
            cancel["cancel_execution(instance_id)<br/><i>Forces instance & pending tasks to CANCELLED</i>"]
            retry["handle_task_failure(task_id)<br/><i>Applies maxRetries & failure diagnostics</i>"]
        end

        subgraph workerDispatcher["WorkerService (worker_service.py)"]
            poll["poll_task(worker_id, supported_queues)<br/><i>Matches queue lanes & allocates concurrency slot</i>"]
            heartbeat["record_heartbeat(worker_id)<br/><i>Updates active timestamp</i>"]
            reclaim["reclaim_dead_workers(timeout_sec)<br/><i>Reassigns tasks from timed-out workers</i>"]
        end
    end

    store[("Unified Store<br/><i>app/persistence/store.py</i>")]

    trigger --> store
    advance --> store
    cancel --> store
    retry --> store
    poll --> store
    heartbeat --> store
    reclaim --> store

    advance <--> poll

    style trigger fill:#1168bd,color:#fff
    style advance fill:#0b4f9e,color:#fff
    style cancel fill:#d9534f,color:#fff
    style poll fill:#1168bd,color:#fff
    style workerDispatcher fill:#0f172a,color:#fff,stroke:#334155
    style stateMachine fill:#0f172a,color:#fff,stroke:#334155
```

### State Transition Lifecycle

$$\text{PENDING} \longrightarrow \text{SCHEDULED} \longrightarrow \text{RUNNING} \longrightarrow \begin{cases} \text{COMPLETED} & \text{(all steps succeeded)} \\ \text{FAILED} & (\text{retries exhausted} \rightarrow \text{AI Diagnostics}) \\ \text{CANCELLED} & (\text{operator manual stop}) \end{cases}$$

**Previous:** [C3 — Component](03-component.md) · **Up:** [C4 Architecture Overview](README.md).
