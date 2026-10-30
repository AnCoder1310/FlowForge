import json
import os
import signal
import sys
import threading
import time
from datetime import datetime, timezone
from typing import List, Optional
import httpx

API_BASE = os.environ.get("API_BASE", "http://127.0.0.1:8000/api/v1")

DEFAULT_WORKER_POOL = [
    {
        "worker_id": "worker-default-01",
        "queues": ["default", "notification"],
        "concurrency": 4,
        "delay": 0.8,
    },
    {
        "worker_id": "worker-compute-01",
        "queues": ["compute"],
        "concurrency": 4,
        "delay": 1.0,
    },
    {
        "worker_id": "worker-ai-01",
        "queues": ["ai-agent"],
        "concurrency": 2,
        "delay": 1.2,
    },
    {
        "worker_id": "worker-data-01",
        "queues": ["data-io"],
        "concurrency": 4,
        "delay": 1.0,
    },
    {
        "worker_id": "worker-payment-01",
        "queues": ["payment", "inventory", "logistics", "documents"],
        "concurrency": 2,
        "delay": 1.0,
    },
]

print_lock = threading.Lock()

def safe_log(message: str):
    with print_lock:
        print(message, flush=True)


def execute_step_logic(
    task: dict,
    instance_id: int,
    worker_id: str,
    client: httpx.Client,
    api_base: str,
    duration: float,
) -> Optional[dict]:
    """
    Executes domain-specific task logic for FlowForge DAG workflows.
    Specifically provides realistic execution for the 7-step Production
    AI Customer Feedback Pipeline with Conditional Branching, Retry, and Idempotency.
    """
    step_id = task.get("stepId") or task.get("step_id", "")
    task_id = task["id"]
    attempt = task.get("attempt") or (task.get("retryCount", 0) + 1)
    max_retries = task.get("maxRetries", 3)

    raw_input = task.get("inputPayloadJson") or "{}"
    try:
        input_data = json.loads(raw_input) if isinstance(raw_input, str) else (raw_input or {})
    except Exception:
        input_data = {}

    # 1. step-fetch-reviews (HTTP_TASK, queue: default)
    if step_id == "step-fetch-reviews":
        # Check if caller wants clean reviews or urgent reviews
        is_clean = (
            input_data.get("simulateClean") is True
            or input_data.get("urgent") is False
            or input_data.get("hasUrgent") is False
            or input_data.get("hasUrgentReviews") is False
        )
        if is_clean:
            reviews = [
                {
                    "id": "rev-101",
                    "customer": "dave.ops@cloudscale.net",
                    "rating": 5,
                    "text": "Topological execution speed improved our pipeline latency by 3x. Excellent platform!",
                    "tags": ["performance", "satisfaction"],
                },
                {
                    "id": "rev-102",
                    "customer": "sarah.dev@startup.io",
                    "rating": 4,
                    "text": "Clean UI and smooth parallel branching across worker nodes. Docs are well written.",
                    "tags": ["ui", "usability"],
                },
                {
                    "id": "rev-103",
                    "customer": "tuan.data@fintech.vn",
                    "rating": 5,
                    "text": "Worker concurrency controls and automatic state machine persistence work flawlessly.",
                    "tags": ["reliability", "orchestration"],
                },
            ]
        else:
            reviews = [
                {
                    "id": "rev-201",
                    "customer": "alex.m@enterprise.com",
                    "rating": 1,
                    "text": "CRITICAL: Database connection pool exhaustion caused complete checkout outage and duplicate billing!",
                    "tags": ["critical", "billing", "outage"],
                },
                {
                    "id": "rev-202",
                    "customer": "linda.k@retailer.org",
                    "rating": 2,
                    "text": "Payment webhook timeout; inventory reserved but order status stuck in pending.",
                    "tags": ["payment", "timeout"],
                },
                {
                    "id": "rev-203",
                    "customer": "mark.p@logistics.co",
                    "rating": 5,
                    "text": "Dashboard telemetry is responsive and worker logs are very easy to trace.",
                    "tags": ["telemetry", "observability"],
                },
            ]
        safe_log(f"   [DATA INGEST] Ingested {len(reviews)} customer reviews ({'CLEAN BATCH' if is_clean else 'URGENT BATCH'})")
        return {
            "status": "SUCCESS",
            "stepId": step_id,
            "reviews": reviews,
            "reviewsCount": len(reviews),
            "sourceType": "CUSTOMER_FEEDBACK_API",
            "cohort": "CLEAN_COHORT" if is_clean else "URGENT_COHORT",
            "fetchedAt": datetime.now(timezone.utc).isoformat(),
        }

    # 2. step-ai-sentiment (AI_AGENT_TASK, queue: ai-agent)
    elif step_id == "step-ai-sentiment":
        reviews = input_data.get("reviews", [])
        has_negative = any(
            r.get("rating", 5) <= 2 or "CRITICAL" in r.get("text", "").upper()
            for r in reviews
        )
        if has_negative:
            sentiment_score = 0.28
            sentiment_label = "NEGATIVE"
            topics = ["Database Pool Outage", "Double Billing Discrepancy", "Webhook Timeout"]
        else:
            sentiment_score = 0.94
            sentiment_label = "POSITIVE"
            topics = ["High Pipeline Throughput", "Platform Reliability", "Telemetry Observability"]

        safe_log(f"   [AI INFERENCE] Sentiment: {sentiment_label} ({sentiment_score:.2f}) | Topics: {', '.join(topics)}")
        return {
            "status": "SUCCESS",
            "stepId": step_id,
            "sentimentScore": sentiment_score,
            "sentimentLabel": sentiment_label,
            "topics": topics,
            "analyzedCount": len(reviews),
            "aiModel": "DWOP-Sentiment-LLM-v2",
            "evaluatedAt": datetime.now(timezone.utc).isoformat(),
        }

    # 3. step-ai-summary (AI_AGENT_TASK, queue: ai-agent) - Runs in parallel with 4
    elif step_id == "step-ai-summary":
        sentiment_label = input_data.get("sentimentLabel", "BALANCED")
        sentiment_score = input_data.get("sentimentScore", 0.5)
        topics = input_data.get("topics", ["Customer Feedback"])
        summary = (
            f"Executive AI Brief: Evaluated incoming customer reports. "
            f"Overall sentiment evaluated as {sentiment_label} (Confidence Score: {sentiment_score:.2f}). "
            f"Core topics identified: {', '.join(topics)}."
        )
        safe_log(f"   [AI SUMMARY] Generated Executive Summary ({len(summary)} chars)")
        return {
            "status": "SUCCESS",
            "stepId": step_id,
            "summary": summary,
            "model": "DWOP-Executive-Summarizer-v1",
            "generatedAt": datetime.now(timezone.utc).isoformat(),
        }

    # 4. step-detect-urgent (AI_AGENT_TASK, queue: ai-agent) - Runs in parallel with 3
    elif step_id == "step-detect-urgent":
        reviews = input_data.get("reviews", [])
        urgent_reviews = [
            r for r in reviews
            if r.get("rating", 5) <= 2
            or any(k in r.get("text", "").upper() for k in ["CRITICAL", "OUTAGE", "BILLING", "CRASH", "TIMEOUT"])
        ]
        has_urgent = len(urgent_reviews) > 0
        safe_log(f"   [AI URGENCY DETECTION] hasUrgentReviews={has_urgent} | Urgent count: {len(urgent_reviews)}")
        return {
            "status": "SUCCESS",
            "stepId": step_id,
            "hasUrgentReviews": has_urgent,
            "urgentCount": len(urgent_reviews),
            "urgentReviews": urgent_reviews,
            "escalationPriority": "P1-CRITICAL" if has_urgent else "NONE",
            "detectedAt": datetime.now(timezone.utc).isoformat(),
        }

    # 5. step-alert-escalate (HTTP_TASK, queue: default) - Conditional branch (hasUrgentReviews == true)
    elif step_id == "step-alert-escalate":
        # Check for simulated failure to test retry mechanism and idempotency
        simulate_fail = input_data.get("simulateSlackFailure") is True
        if simulate_fail and attempt == 1:
            safe_log(
                f"\n⚠️  [SLACK SIMULATED TRANSIENT FAILURE]\n"
                f"Worker: {worker_id}\n"
                f"Task: #{task_id} (Attempt {attempt}/{max_retries})\n"
                f"Reason: HTTP 429 Too Many Requests (Rate limit hit)\n"
                f"Action: Reporting transient failure to Orchestrator with canRetry=True...\n"
            )
            client.post(
                f"{api_base}/tasks/{task_id}/fail",
                json={
                    "errorMessage": "Slack Webhook HTTP 429: Too Many Requests (Transient Rate Limit)",
                    "canRetry": True,
                },
            )
            return None  # Rescheduled by orchestrator, skip complete

        idempotency_key = f"slack-escalate-inst-{instance_id}"
        urgent_count = input_data.get("urgentCount", 1)
        safe_log(f"   [SLACK DISPATCH] Idempotency-Key: '{idempotency_key}' | Attempt: {attempt}/{max_retries} | Channel: #p1-customer-escalations")
        return {
            "status": "SUCCESS",
            "stepId": step_id,
            "slackAlertStatus": "SENT",
            "channel": "#p1-customer-escalations",
            "idempotencyKey": idempotency_key,
            "attempt": attempt,
            "message": f"🚨 P1 Incident Escalation: {urgent_count} critical customer review(s) require engineering intervention.",
            "dispatchedAt": datetime.now(timezone.utc).isoformat(),
        }

    # 6. step-persist-insights (WORKER_TASK, queue: data-io) - Join resolution of branches
    elif step_id == "step-persist-insights":
        summary = input_data.get("summary", "Executive summary recorded.")
        sentiment_label = input_data.get("sentimentLabel", "NEUTRAL")
        sentiment_score = input_data.get("sentimentScore", 0.5)
        topics = input_data.get("topics", [])
        urgent_reviews = input_data.get("urgentReviews", [])
        urgent_count = input_data.get("urgentCount", len(urgent_reviews))
        slack_status = input_data.get("slackAlertStatus", "SKIPPED")

        safe_log(
            f"   [PERSIST INSIGHTS] Converged data saved:\n"
            f"   ├─ Summary: {summary[:50]}...\n"
            f"   ├─ Sentiment: {sentiment_label} ({sentiment_score})\n"
            f"   ├─ Topics: {', '.join(topics)}\n"
            f"   ├─ Urgent Reviews: {urgent_count}\n"
            f"   └─ Slack Status: {slack_status}"
        )

        return {
            "status": "SUCCESS",
            "stepId": step_id,
            "persisted": True,
            "insightsRecordId": f"insights-inst-{instance_id}",
            "summary": summary,
            "sentiment": {
                "label": sentiment_label,
                "score": sentiment_score,
            },
            "topics": topics,
            "urgentReviews": urgent_reviews,
            "urgentCount": urgent_count,
            "slackAlertStatus": slack_status,
            "destination": "DWOP_ANALYTICS_WAREHOUSE",
            "persistedAt": datetime.now(timezone.utc).isoformat(),
        }

    # 7. step-notify-report-ready & step-notify-dispatch (NOTIFICATION, queue: notification)
    elif step_id in ("step-notify-report-ready", "step-notify-dispatch") or task.get("taskType") == "NOTIFICATION":
        safe_log(f"   [NOTIFICATION DISPATCH] Dispatched report ready notification to stakeholders")
        return {
            "status": "SUCCESS",
            "stepId": step_id,
            "notificationStatus": "DELIVERED",
            "channel": "email-digest",
            "recipients": ["ops-lead@flowforge.internal", "analytics@flowforge.internal"],
            "reportId": f"insights-inst-{instance_id}",
            "deliveredAt": datetime.now(timezone.utc).isoformat(),
        }

    # Generic fallback for standard tasks in other workflows
    return {
        "status": "SUCCESS",
        "workerId": worker_id,
        "queue": task.get("queueName", "default"),
        "durationSeconds": round(duration, 3),
        "completedAt": datetime.now(timezone.utc).isoformat(),
    }


class WorkerNodeDaemon:
    def __init__(
        self,
        worker_id: str,
        queues: List[str],
        max_concurrency: int = 4,
        task_delay: float = 1.0,
        api_base: str = API_BASE,
    ):
        self.worker_id = worker_id
        self.queues = queues
        self.max_concurrency = max_concurrency
        self.task_delay = task_delay
        self.api_base = api_base
        self.client = httpx.Client(timeout=10.0)
        self.stop_event = threading.Event()
        self.thread: Optional[threading.Thread] = None

    def register(self) -> bool:
        try:
            resp = self.client.post(
                f"{self.api_base}/workers/register",
                json={
                    "workerId": self.worker_id,
                    "hostname": "local-worker-daemon",
                    "supportedQueues": self.queues,
                    "maxConcurrency": self.max_concurrency,
                },
            )
            if resp.status_code == 200:
                q_str = ", ".join(self.queues)
                safe_log(
                    f"\n[WORKER REGISTERED]\n"
                    f"Worker: {self.worker_id}\n"
                    f"Queues: {q_str}\n"
                    f"Concurrency: {self.max_concurrency}\n"
                    f"--------------------------------------------------"
                )
                return True
            else:
                safe_log(f"⚠️ Worker {self.worker_id} register returned {resp.status_code}")
                return False
        except Exception as e:
            safe_log(f"⚠️ Worker {self.worker_id} failed to connect to {self.api_base}: {e}")
            return False

    def loop(self):
        self.register()
        heartbeat_counter = 0

        while not self.stop_event.is_set():
            try:
                # 1. Periodic Heartbeat every 5 iterations (~5-7s)
                heartbeat_counter += 1
                if heartbeat_counter >= 5:
                    heartbeat_counter = 0
                    try:
                        self.client.post(f"{self.api_base}/workers/{self.worker_id}/heartbeat")
                    except Exception:
                        pass

                # 2. Poll for scheduled tasks matching subscribed queues
                poll_resp = self.client.post(
                    f"{self.api_base}/tasks/poll",
                    json={"workerId": self.worker_id, "queues": self.queues},
                )

                if poll_resp.status_code == 200:
                    data = poll_resp.json()
                    task = data.get("task")
                    if task:
                        task_id = task["id"]
                        step_name = task["stepName"]
                        queue_name = task["queueName"]
                        instance_id = data.get("instanceId", 0)
                        workflow_name = data.get("workflowName", "Workflow")
                        attempt = task.get("attempt") or (task.get("retryCount", 0) + 1)
                        max_retries = task.get("maxRetries", 3)

                        now_str = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")

                        safe_log(
                            f"\n⚡ [TASK CLAIMED]\n"
                            f"Worker: {self.worker_id}\n"
                            f"Task: #{task_id} '{step_name}'\n"
                            f"Queue: {queue_name}\n"
                            f"Attempt: {attempt}/{max_retries}\n"
                            f"Workflow: #{instance_id} ('{workflow_name}')"
                        )

                        safe_log(
                            f"\n▶️ [TASK STARTED]\n"
                            f"Worker: {self.worker_id}\n"
                            f"Task: #{task_id} '{step_name}'\n"
                            f"Started At: {now_str}"
                        )

                        # 3. Simulate processing time
                        start_time = time.time()
                        time.sleep(self.task_delay)
                        duration = time.time() - start_time

                        # 4. Execute domain logic
                        exec_result = execute_step_logic(
                            task=task,
                            instance_id=instance_id,
                            worker_id=self.worker_id,
                            client=self.client,
                            api_base=self.api_base,
                            duration=duration,
                        )

                        if exec_result is None:
                            # Task failed gracefully (e.g. simulated retry)
                            continue

                        # 5. Report task completion to Orchestrator
                        output_payload = json.dumps(exec_result)

                        comp_resp = self.client.post(
                            f"{self.api_base}/tasks/{task_id}/complete",
                            json={"outputPayloadJson": output_payload},
                        )

                        safe_log(
                            f"\n✅ [TASK COMPLETED]\n"
                            f"Worker: {self.worker_id}\n"
                            f"Task: #{task_id} '{step_name}'\n"
                            f"Duration: {duration:.2f}s\n"
                            f"Attempt: {attempt}/{max_retries}"
                        )

                        if comp_resp.status_code == 200:
                            res_data = comp_resp.json()
                            released = res_data.get("releasedSteps") or []
                            if released:
                                rel_str = ", ".join(released)
                                safe_log(
                                    f"\n🚀 [ORCHESTRATOR CASCADE]\n"
                                    f"Task #{task_id} completed successfully.\n"
                                    f"Checking downstream dependencies...\n"
                                    f"Released {len(released)} eligible tasks: {rel_str}\n"
                                )
                            else:
                                safe_log(
                                    f"\n🚀 [ORCHESTRATOR CASCADE]\n"
                                    f"Task #{task_id} completed successfully.\n"
                                    f"Checking downstream dependencies: All downstream tasks resolved or waiting on other branches.\n"
                                )

                # Polling interval
                time.sleep(1.2)
            except Exception:
                time.sleep(1.5)

    def start(self):
        self.thread = threading.Thread(target=self.loop, daemon=True)
        self.thread.start()

    def stop(self):
        self.stop_event.set()
        try:
            self.client.close()
        except Exception:
            pass


def run_cluster(worker_configs: List[dict]):
    safe_log("==========================================================")
    safe_log("  FlowForge Distributed Worker Cluster Daemon")
    safe_log("==========================================================")
    safe_log(f">> Kết nối API Orchestrator: {API_BASE}")
    safe_log(f">> Khởi tạo cụm {len(worker_configs)} Worker Nodes chuyên biệt theo từng hàng đợi...")

    workers = []
    for cfg in worker_configs:
        w = WorkerNodeDaemon(
            worker_id=cfg["worker_id"],
            queues=cfg["queues"],
            max_concurrency=cfg.get("concurrency", 4),
            task_delay=cfg.get("delay", 1.0),
        )
        workers.append(w)
        w.start()

    def signal_handler(sig, frame):
        safe_log("\n👋 Đang dừng toàn bộ Cụm Worker Nodes an toàn...")
        for w in workers:
            w.stop()
        sys.exit(0)

    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)

    while True:
        time.sleep(1)


def run_single(worker_id: str, queues: List[str], concurrency: int = 4):
    if "default" in queues and "notification" not in queues:
        queues.append("notification")
    q_str = ", ".join(queues)
    safe_log("==========================================================")
    safe_log(f"  FlowForge Single Worker Agent: {worker_id}")
    safe_log(f"  Hàng đợi phụ trách: {q_str}")
    safe_log("==========================================================")
    w = WorkerNodeDaemon(worker_id=worker_id, queues=queues, max_concurrency=concurrency)
    w.loop()


if __name__ == "__main__":
    if len(sys.argv) >= 3:
        w_id = sys.argv[1]
        q_list = [q.strip() for q in sys.argv[2].split(",") if q.strip()]
        conc = int(sys.argv[3]) if len(sys.argv) >= 4 else 4
        run_single(w_id, q_list, conc)
    else:
        run_cluster(DEFAULT_WORKER_POOL)
