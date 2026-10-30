import json
import pytest
from datetime import datetime, timezone
from app.domain.models import (
    DagDefinition,
    DagStep,
    TaskType,
    StepStatus,
    WorkflowStatus,
    WorkflowDefinition,
    CreateWorkflowRequest,
    TriggerWorkflowRequest,
    CompleteTaskRequest,
    FailTaskRequest,
)
from app.domain.dag_engine import DagEngine
from app.persistence.store import store
from app.services.execution_service import ExecutionService
from app.core.exceptions import AppException


def get_production_feedback_dag() -> DagDefinition:
    return DagDefinition(
        steps=[
            DagStep(
                id="step-fetch-reviews",
                name="Fetch Customer Reviews",
                type=TaskType.HTTP_TASK,
                queue="default",
                dependsOn=[],
                maxRetries=3,
                timeoutSeconds=30,
            ),
            DagStep(
                id="step-ai-sentiment",
                name="AI Sentiment & Topic Classification",
                type=TaskType.AI_AGENT_TASK,
                queue="ai-agent",
                dependsOn=["step-fetch-reviews"],
                maxRetries=2,
                timeoutSeconds=60,
            ),
            DagStep(
                id="step-ai-summary",
                name="AI Executive Summary Generation",
                type=TaskType.AI_AGENT_TASK,
                queue="ai-agent",
                dependsOn=["step-ai-sentiment"],
                maxRetries=2,
                timeoutSeconds=90,
            ),
            DagStep(
                id="step-detect-urgent",
                name="Detect Urgent Reviews",
                type=TaskType.AI_AGENT_TASK,
                queue="ai-agent",
                dependsOn=["step-ai-sentiment"],
                maxRetries=2,
                timeoutSeconds=45,
            ),
            DagStep(
                id="step-alert-escalate",
                name="Escalate Urgent Issues to Slack",
                type=TaskType.HTTP_TASK,
                queue="default",
                dependsOn=["step-detect-urgent"],
                maxRetries=3,
                timeoutSeconds=30,
                condition="hasUrgentReviews == true",
            ),
            DagStep(
                id="step-persist-insights",
                name="Store Analytics Insights",
                type=TaskType.WORKER_TASK,
                queue="data-io",
                dependsOn=["step-ai-summary", "step-alert-escalate"],
                maxRetries=3,
                timeoutSeconds=120,
            ),
            DagStep(
                id="step-notify-report-ready",
                name="Notify Analytics Report Ready",
                type=TaskType.NOTIFICATION,
                queue="notification",
                dependsOn=["step-persist-insights"],
                maxRetries=2,
                timeoutSeconds=30,
            ),
        ]
    )


def test_kahn_topological_layers_partitioning():
    """Requirement 10: Verify Kahn's Algorithm produces the exact expected 6 execution layers."""
    dag = get_production_feedback_dag()
    layers = DagEngine.compute_execution_layers(dag)

    assert len(layers) == 6
    # Layer 0 (Stage 1): Root Ingest
    assert layers[0] == ["step-fetch-reviews"]
    # Layer 1 (Stage 2): AI Sentiment
    assert layers[1] == ["step-ai-sentiment"]
    # Layer 2 (Stage 3): Parallel AI Summary & Urgent Detection
    assert set(layers[2]) == {"step-ai-summary", "step-detect-urgent"}
    # Layer 3 (Stage 4): Conditional Slack Escalation
    assert layers[3] == ["step-alert-escalate"]
    # Layer 4 (Stage 5): Join / Convergence Persist Insights
    assert layers[4] == ["step-persist-insights"]
    # Layer 5 (Stage 6): Notification Dispatch
    assert layers[5] == ["step-notify-report-ready"]


def test_dag_cycle_prevention():
    """Kahn cycle detection raises AppException when an invalid cycle is introduced."""
    dag = DagDefinition(
        steps=[
            DagStep(id="a", name="A", type=TaskType.HTTP_TASK, dependsOn=["b"]),
            DagStep(id="b", name="B", type=TaskType.WORKER_TASK, dependsOn=["a"]),
        ]
    )
    with pytest.raises(AppException):
        DagEngine.validate_dag(dag)


def test_condition_evaluator_expressions():
    """Unit test condition evaluation against various context payloads."""
    ctx_true = {"hasUrgentReviews": True, "urgentCount": 3}
    ctx_false = {"hasUrgentReviews": False, "urgentCount": 0}

    assert DagEngine.evaluate_condition("hasUrgentReviews == true", ctx_true) is True
    assert DagEngine.evaluate_condition("hasUrgentReviews == true", ctx_false) is False
    assert DagEngine.evaluate_condition("urgentCount > 0", ctx_true) is True
    assert DagEngine.evaluate_condition("urgentCount > 0", ctx_false) is False
    assert DagEngine.evaluate_condition(None, ctx_false) is True
    assert DagEngine.evaluate_condition("", ctx_false) is True


def test_e2e_urgent_review_execution_flow():
    """
    Test Case 1: Urgent Reviews detected.
    - step-alert-escalate is evaluated to True and SCHEDULED.
    - Slack alert completes with status SENT and idempotency key.
    - Join step receives merged context containing summary, sentiment, urgent reviews and SENT alert status.
    - Entire workflow finishes with COMPLETED status.
    """
    dag = get_production_feedback_dag()
    wf = WorkflowDefinition(
        id=991,
        name="Test-Feedback-Urgent",
        version=1,
        description="Urgent test",
        dag=dag,
        isActive=True,
        createdBy=1,
        createdAt=datetime.now(timezone.utc),
        updatedAt=datetime.now(timezone.utc),
    )
    added_wf = store.add_workflow(wf)

    # 1. Trigger workflow
    inst = ExecutionService.trigger_workflow(
        added_wf.id,
        TriggerWorkflowRequest(inputPayloadJson=json.dumps({"hasUrgent": True})),
        user=store.users[1],
    )
    assert inst.status == WorkflowStatus.RUNNING

    tasks = store.get_tasks_for_instance(inst.id)
    assert len(tasks) == 7

    # Root step should be SCHEDULED, others PENDING
    fetch_task = next(t for t in tasks if t.stepId == "step-fetch-reviews")
    assert fetch_task.status == StepStatus.SCHEDULED

    # Complete Step 1: fetch-reviews
    fetch_out = {
        "reviews": [
            {"id": "r1", "rating": 1, "text": "CRITICAL: System crash and double charge!"}
        ],
        "reviewsCount": 1,
    }
    ExecutionService.complete_task(
        fetch_task.id, CompleteTaskRequest(outputPayloadJson=json.dumps(fetch_out))
    )

    # Step 2: sentiment should now be SCHEDULED
    sentiment_task = next(t for t in store.get_tasks_for_instance(inst.id) if t.stepId == "step-ai-sentiment")
    assert sentiment_task.status == StepStatus.SCHEDULED

    sentiment_out = {
        "sentimentScore": 0.25,
        "sentimentLabel": "NEGATIVE",
        "topics": ["Crash", "Double Charge"],
    }
    ExecutionService.complete_task(
        sentiment_task.id, CompleteTaskRequest(outputPayloadJson=json.dumps(sentiment_out))
    )

    # Step 3 & 4: Both step-ai-summary and step-detect-urgent must run in parallel (both SCHEDULED)!
    summary_task = next(t for t in store.get_tasks_for_instance(inst.id) if t.stepId == "step-ai-summary")
    detect_task = next(t for t in store.get_tasks_for_instance(inst.id) if t.stepId == "step-detect-urgent")
    assert summary_task.status == StepStatus.SCHEDULED
    assert detect_task.status == StepStatus.SCHEDULED

    # Complete Step 3: summary
    summary_out = {"summary": "Executive AI Brief: Urgent negative feedback requiring mitigation."}
    ExecutionService.complete_task(
        summary_task.id, CompleteTaskRequest(outputPayloadJson=json.dumps(summary_out))
    )

    # Join step is NOT scheduled yet because step-alert-escalate (or detect-urgent) hasn't finished
    persist_task = next(t for t in store.get_tasks_for_instance(inst.id) if t.stepId == "step-persist-insights")
    assert persist_task.status == StepStatus.PENDING

    # Complete Step 4: detect-urgent (with hasUrgentReviews: True)
    detect_out = {
        "hasUrgentReviews": True,
        "urgentCount": 1,
        "urgentReviews": [{"id": "r1", "rating": 1, "text": "CRITICAL: System crash and double charge!"}],
    }
    ExecutionService.complete_task(
        detect_task.id, CompleteTaskRequest(outputPayloadJson=json.dumps(detect_out))
    )

    # Step 5: step-alert-escalate condition evaluated to True -> must be SCHEDULED!
    alert_task = next(t for t in store.get_tasks_for_instance(inst.id) if t.stepId == "step-alert-escalate")
    assert alert_task.status == StepStatus.SCHEDULED

    # Complete Step 5: alert-escalate with Idempotency Key
    idempotency_key = f"slack-escalate-inst-{inst.id}"
    alert_out = {
        "slackAlertStatus": "SENT",
        "channel": "#customer-escalations",
        "idempotencyKey": idempotency_key,
    }
    ExecutionService.complete_task(
        alert_task.id, CompleteTaskRequest(outputPayloadJson=json.dumps(alert_out))
    )

    # Step 6: Join Step step-persist-insights must now be SCHEDULED!
    persist_task = next(t for t in store.get_tasks_for_instance(inst.id) if t.stepId == "step-persist-insights")
    assert persist_task.status == StepStatus.SCHEDULED

    # Verify input payload to persist contains merged context
    merged_input = json.loads(persist_task.inputPayloadJson)
    assert merged_input.get("summary") == summary_out["summary"]
    assert merged_input.get("sentimentLabel") == "NEGATIVE"
    assert merged_input.get("urgentCount") == 1
    assert merged_input.get("slackAlertStatus") == "SENT"

    # Complete Step 6: persist
    persist_out = {
        "persisted": True,
        "summary": merged_input.get("summary"),
        "sentiment": {"label": "NEGATIVE", "score": 0.25},
        "topics": ["Crash", "Double Charge"],
        "urgentReviews": merged_input.get("urgentReviews"),
        "slackAlertStatus": "SENT",
    }
    ExecutionService.complete_task(
        persist_task.id, CompleteTaskRequest(outputPayloadJson=json.dumps(persist_out))
    )

    # Step 7: step-notify-report-ready must now be SCHEDULED
    notify_task = next(t for t in store.get_tasks_for_instance(inst.id) if t.stepId == "step-notify-report-ready")
    assert notify_task.status == StepStatus.SCHEDULED

    # Complete Step 7: notify
    notify_out = {"notificationStatus": "DELIVERED"}
    ExecutionService.complete_task(
        notify_task.id, CompleteTaskRequest(outputPayloadJson=json.dumps(notify_out))
    )

    # Workflow Instance must now be COMPLETED!
    final_inst = store.get_instance(inst.id)
    assert final_inst.status == WorkflowStatus.COMPLETED
    assert final_inst.completedAt is not None


def test_e2e_clean_review_skipped_flow():
    """
    Test Case 2: Clean Reviews (no urgent issues).
    - hasUrgentReviews == false.
    - step-alert-escalate is automatically marked SKIPPED by Orchestrator.
    - Join step (step-persist-insights) is NOT blocked and unblocks cleanly.
    - Persisted insights records slackAlertStatus == 'SKIPPED'.
    - Workflow completes with COMPLETED status.
    """
    dag = get_production_feedback_dag()
    wf = WorkflowDefinition(
        id=992,
        name="Test-Feedback-Clean",
        version=1,
        description="Clean test",
        dag=dag,
        isActive=True,
        createdBy=1,
        createdAt=datetime.now(timezone.utc),
        updatedAt=datetime.now(timezone.utc),
    )
    added_wf = store.add_workflow(wf)

    inst = ExecutionService.trigger_workflow(
        added_wf.id,
        TriggerWorkflowRequest(inputPayloadJson=json.dumps({"simulateClean": True})),
        user=store.users[1],
    )

    # 1. Fetch
    fetch_task = next(t for t in store.get_tasks_for_instance(inst.id) if t.stepId == "step-fetch-reviews")
    ExecutionService.complete_task(
        fetch_task.id,
        CompleteTaskRequest(
            outputPayloadJson=json.dumps(
                {"reviews": [{"id": "r10", "rating": 5, "text": "Superb product!"}], "reviewsCount": 1}
            )
        ),
    )

    # 2. Sentiment
    sentiment_task = next(t for t in store.get_tasks_for_instance(inst.id) if t.stepId == "step-ai-sentiment")
    ExecutionService.complete_task(
        sentiment_task.id,
        CompleteTaskRequest(
            outputPayloadJson=json.dumps(
                {"sentimentScore": 0.95, "sentimentLabel": "POSITIVE", "topics": ["Platform Reliability"]}
            )
        ),
    )

    # 3. Summary (parallel branch 1)
    summary_task = next(t for t in store.get_tasks_for_instance(inst.id) if t.stepId == "step-ai-summary")
    ExecutionService.complete_task(
        summary_task.id,
        CompleteTaskRequest(
            outputPayloadJson=json.dumps({"summary": "Executive AI Brief: All customer metrics positive."})
        ),
    )

    # 4. Detect Urgent (parallel branch 2) -> returns hasUrgentReviews: False
    detect_task = next(t for t in store.get_tasks_for_instance(inst.id) if t.stepId == "step-detect-urgent")
    ExecutionService.complete_task(
        detect_task.id,
        CompleteTaskRequest(
            outputPayloadJson=json.dumps(
                {"hasUrgentReviews": False, "urgentCount": 0, "urgentReviews": []}
            )
        ),
    )

    # Orchestrator should have marked step-alert-escalate as SKIPPED
    alert_task = next(t for t in store.get_tasks_for_instance(inst.id) if t.stepId == "step-alert-escalate")
    assert alert_task.status == StepStatus.SKIPPED
    assert "SKIPPED" in alert_task.outputPayloadJson

    # Join step step-persist-insights must be SCHEDULED because its dependencies are COMPLETED + SKIPPED!
    persist_task = next(t for t in store.get_tasks_for_instance(inst.id) if t.stepId == "step-persist-insights")
    assert persist_task.status == StepStatus.SCHEDULED

    merged_input = json.loads(persist_task.inputPayloadJson)
    assert merged_input.get("slackAlertStatus") == "SKIPPED"

    # Complete Persist
    ExecutionService.complete_task(
        persist_task.id,
        CompleteTaskRequest(
            outputPayloadJson=json.dumps(
                {
                    "persisted": True,
                    "summary": merged_input.get("summary"),
                    "sentiment": {"label": "POSITIVE", "score": 0.95},
                    "topics": ["Platform Reliability"],
                    "urgentReviews": [],
                    "slackAlertStatus": "SKIPPED",
                }
            )
        ),
    )

    # Complete Notify
    notify_task = next(t for t in store.get_tasks_for_instance(inst.id) if t.stepId == "step-notify-report-ready")
    assert notify_task.status == StepStatus.SCHEDULED
    ExecutionService.complete_task(
        notify_task.id,
        CompleteTaskRequest(outputPayloadJson=json.dumps({"notificationStatus": "DELIVERED"})),
    )

    # Overall workflow reaches COMPLETED
    final_inst = store.get_instance(inst.id)
    assert final_inst.status == WorkflowStatus.COMPLETED


def test_slack_retry_and_idempotency():
    """
    Requirement 8: Test retry mechanism and idempotency on transient failure.
    - Slack step fails with canRetry=True.
    - Orchestrator reschedules task (retryCount increments, attempt becomes 2).
    - Idempotency key remains consistent across attempts.
    """
    dag = get_production_feedback_dag()
    wf = WorkflowDefinition(
        id=993,
        name="Test-Slack-Retry",
        version=1,
        description="Retry test",
        dag=dag,
        isActive=True,
        createdBy=1,
        createdAt=datetime.now(timezone.utc),
        updatedAt=datetime.now(timezone.utc),
    )
    added_wf = store.add_workflow(wf)

    inst = ExecutionService.trigger_workflow(
        added_wf.id,
        TriggerWorkflowRequest(inputPayloadJson=json.dumps({"urgent": True})),
        user=store.users[1],
    )

    # Advance to step-alert-escalate
    fetch = next(t for t in store.get_tasks_for_instance(inst.id) if t.stepId == "step-fetch-reviews")
    ExecutionService.complete_task(fetch.id, CompleteTaskRequest(outputPayloadJson="{}"))

    sentiment = next(t for t in store.get_tasks_for_instance(inst.id) if t.stepId == "step-ai-sentiment")
    ExecutionService.complete_task(sentiment.id, CompleteTaskRequest(outputPayloadJson="{}"))

    summary = next(t for t in store.get_tasks_for_instance(inst.id) if t.stepId == "step-ai-summary")
    ExecutionService.complete_task(summary.id, CompleteTaskRequest(outputPayloadJson="{}"))

    detect = next(t for t in store.get_tasks_for_instance(inst.id) if t.stepId == "step-detect-urgent")
    ExecutionService.complete_task(
        detect.id,
        CompleteTaskRequest(outputPayloadJson=json.dumps({"hasUrgentReviews": True, "urgentCount": 1})),
    )

    alert = next(t for t in store.get_tasks_for_instance(inst.id) if t.stepId == "step-alert-escalate")
    assert alert.status == StepStatus.SCHEDULED
    assert alert.retryCount == 0

    # Simulate Slack transient 429 error on Attempt 1
    failed_task = ExecutionService.fail_task(
        alert.id,
        FailTaskRequest(
            errorMessage="HTTP 429: Too Many Requests from Slack API",
            canRetry=True,
        ),
    )

    # Task must be rescheduled for Attempt 2
    assert failed_task.status == StepStatus.SCHEDULED
    assert failed_task.retryCount == 1
    assert failed_task.attempt == 2

    # Now attempt 2 succeeds with Idempotency Key
    idempotency_key = f"slack-escalate-inst-{inst.id}"
    succeeded_task = ExecutionService.complete_task(
        alert.id,
        CompleteTaskRequest(
            outputPayloadJson=json.dumps(
                {
                    "slackAlertStatus": "SENT",
                    "idempotencyKey": idempotency_key,
                    "attempt": 2,
                }
            )
        ),
    )
    assert succeeded_task.status == StepStatus.COMPLETED
