import json
import logging
import os
import re
from typing import Dict, List, Optional, Set
import httpx

from app.core.exceptions import AppException
from app.domain.dag_engine import DagEngine
from app.domain.models import (
    AiDiagnoseFailureResponse,
    AiGenerateWorkflowResponse,
    DagDefinition,
    DagStep,
    StepStatus,
    TaskType,
)
from app.persistence.store import store

logger = logging.getLogger(__name__)

# Supported backend task types and queues
ALLOWED_TASK_TYPES = {
    TaskType.HTTP_TASK,
    TaskType.WORKER_TASK,
    TaskType.AI_AGENT_TASK,
    TaskType.NOTIFICATION,
}

SUPPORTED_QUEUES = {
    "default",
    "compute",
    "data-io",
    "payment",
    "ai-agent",
    "notification",
    "inventory",
    "logistics",
    "documents",
    "ml-worker",
}

SYSTEM_PROMPT = """You are an expert Distributed Systems Architect for FlowForge (Distributed Workflow Orchestration Platform - DWOP).
Your task is to decompose a business process prompt into an optimal, production-grade Directed Acyclic Graph (DAG) workflow.

CRITICAL ARCHITECTURAL RULES:
1. Business Process Decomposition:
   - Decompose into distinct, purposeful tasks: Input ingestion, Validation/Check, Business Processing/Computation, Storage/Persistence, and Notification/Output.
   - Never omit essential input, processing, verification, storage, or output steps.
   - Do not invent unrelated tasks not grounded in the user's business description.

2. Dependency Detection & Concurrency:
   - Determine exact causal dependencies using `dependsOn`.
   - Tasks that do NOT depend on each other MUST run in parallel branches (e.g., parallel payment charge and inventory check; or parallel sentiment analysis and urgent escalation).
   - Any task that needs results from multiple upstream branches MUST include ALL upstream branch step IDs in its `dependsOn` list (fan-in / merge).
   - No redundant dependencies or inverted order.

3. Task Type Classification:
   Strictly classify each step into one of the 4 supported backend types:
   - "HTTP_TASK": For external HTTP APIs, REST endpoints, webhooks, or external integration calls.
   - "WORKER_TASK": For core business logic, computation, transformation, database queries/writes.
   - "AI_AGENT_TASK": For LLM analysis, AI reasoning, sentiment analysis, anomaly detection, summarization.
   - "NOTIFICATION": For alerts, Slack/email notifications, customer messaging.
   DO NOT use any other task type enum.

4. Queue Assignment:
   Assign each step to a supported queue matching its workload:
   - "default": For HTTP tasks, webhooks, generic lightweight tasks.
   - "compute": For CPU-intensive computation, validation, business rule execution.
   - "data-io": For database read/write, ETL ingestion/load, storage persistence.
   - "payment": For financial transactions, checkout, billing.
   - "ai-agent": For AI agent inference, semantic reasoning, anomaly detection.
   - "notification": For push notifications, emails, alerts.
   - "inventory": For stock allocation.
   - "logistics": For shipment dispatch.
   - "documents": For PDF/document generation.

5. Reliability Configuration:
   - "maxRetries": 1-2 for tasks with side effects (payment, notifications, external webhooks); 2-3 for idempotent tasks (compute, data-io, AI). Never exceed 5.
   - "timeoutSeconds": 15-30 for HTTP/notifications; 45-90 for AI agents; 120-300 for compute/data-io.

6. DAG Validity:
   - Step IDs must be unique strings (kebab-case, e.g. "step-fetch-reviews").
   - Every ID in `dependsOn` must exist in the steps array.
   - A step must never depend on itself.
   - The graph must be strictly acyclic (no circular dependencies).

7. Strict JSON Output Schema:
   Respond with pure valid JSON ONLY without any markdown code fences or conversational text:
   {
     "name": "Short-Descriptive-Name",
     "description": "Comprehensive explanation of the business flow...",
     "reasoning": "Detailed explanation of the architectural decomposition, parallel branches, and reliability...",
     "dag": {
       "steps": [
         {
           "id": "step-id",
           "name": "Step Name",
           "type": "WORKER_TASK",
           "queue": "compute",
           "dependsOn": [],
           "maxRetries": 3,
           "timeoutSeconds": 120,
           "configurationJson": null
         }
       ]
     }
   }
"""


class AiOrchestratorService:
    @classmethod
    def _call_9router(cls, prompt: str) -> Optional[dict]:
        """Call local/remote 9Router OpenAI-compatible chat completions endpoint."""
        router_base = os.environ.get("ROUTER_BASE_URL", os.environ.get("NINEROUTER_BASE_URL", "http://localhost:20128/v1")).rstrip("/")
        router_key = os.environ.get("ROUTER_KEY", os.environ.get("NINEROUTER_API_KEY", "sk-3de32802bddf729c-p3z5m1-7d22f262"))
        ai_model = os.environ.get("AI_MODEL", "gpt-4o-mini")
        ai_timeout = float(os.environ.get("AI_TIMEOUT", "10.0"))

        url = f"{router_base}/chat/completions"
        headers = {
            "Authorization": f"Bearer {router_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": ai_model,
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ],
            "response_format": {"type": "json_object"},
            "temperature": 0.2,
        }

        try:
            with httpx.Client(timeout=ai_timeout) as client:
                res = client.post(url, json=payload, headers=headers)
                if res.status_code == 200:
                    data = res.json()
                    choices = data.get("choices", [])
                    if choices:
                        content = choices[0].get("message", {}).get("content", "").strip()
                        # Strip markdown fences if present
                        if content.startswith("```"):
                            content = re.sub(r"^```(?:json)?\s*", "", content)
                            content = re.sub(r"\s*```$", "", content)
                        parsed = json.loads(content)
                        if isinstance(parsed, dict) and "dag" in parsed:
                            return parsed
        except Exception as e:
            logger.debug("9Router invocation failed, falling back to local decomposition: %s", e)
            return None

        return None

    @classmethod
    def _sanitize_and_repair_dag(cls, raw: dict, prompt: str) -> AiGenerateWorkflowResponse:
        """Sanitizes, validates, and repairs a DAG dictionary to strictly meet all backend invariants."""
        name = str(raw.get("name") or "Workflow-Generated").strip()
        description = str(raw.get("description") or f"Quy trình tự động hóa: {prompt}").strip()
        reasoning = str(raw.get("reasoning") or "Đã phân rã quy trình thành các bước độc lập với nhánh song song.").strip()

        dag_raw = raw.get("dag") or {}
        raw_steps = dag_raw.get("steps") if isinstance(dag_raw, dict) else []
        if not raw_steps or not isinstance(raw_steps, list):
            raise AppException.validation("AI không tạo được danh sách bước hợp lệ.")

        sanitized_steps: List[DagStep] = []
        seen_ids: Set[str] = set()

        for idx, s in enumerate(raw_steps):
            if not isinstance(s, dict):
                continue

            raw_id = str(s.get("id") or f"step-{idx+1}").strip()
            clean_id = re.sub(r"[^a-zA-Z0-9_-]", "-", raw_id).strip("-") or f"step-{idx+1}"
            while clean_id in seen_ids:
                clean_id = f"{clean_id}-{idx+1}"
            seen_ids.add(clean_id)

            step_name = str(s.get("name") or f"Step {idx+1}").strip()

            # Task Type Classification
            raw_type = str(s.get("type") or "WORKER_TASK").strip().upper()
            if raw_type in {t.value for t in ALLOWED_TASK_TYPES}:
                task_type = TaskType(raw_type)
            elif "HTTP" in raw_type or "API" in raw_type or "WEBHOOK" in raw_type:
                task_type = TaskType.HTTP_TASK
            elif "AI" in raw_type or "AGENT" in raw_type or "LLM" in raw_type or "SENTIMENT" in raw_type:
                task_type = TaskType.AI_AGENT_TASK
            elif "NOTIF" in raw_type or "ALERT" in raw_type or "SLACK" in raw_type or "EMAIL" in raw_type:
                task_type = TaskType.NOTIFICATION
            else:
                task_type = TaskType.WORKER_TASK

            # Queue Assignment
            raw_queue = str(s.get("queue") or "default").strip().lower()
            if raw_queue in SUPPORTED_QUEUES:
                queue_name = raw_queue
            else:
                # Default mapping based on task type
                if task_type == TaskType.AI_AGENT_TASK:
                    queue_name = "ai-agent"
                elif task_type == TaskType.NOTIFICATION:
                    queue_name = "notification"
                elif task_type == TaskType.HTTP_TASK:
                    queue_name = "default"
                elif any(k in step_name.lower() for k in ["payment", "charge", "thanh toán"]):
                    queue_name = "payment"
                elif any(k in step_name.lower() for k in ["database", "db", "store", "persist", "kho", "lưu"]):
                    queue_name = "data-io"
                else:
                    queue_name = "compute"

            # Reliability Configuration
            try:
                retries = int(s.get("maxRetries", 3))
            except (ValueError, TypeError):
                retries = 3
            if task_type in (TaskType.NOTIFICATION, TaskType.HTTP_TASK) or queue_name == "payment":
                retries = max(1, min(retries, 2))  # side effect protection
            else:
                retries = max(1, min(retries, 5))

            try:
                timeout = int(s.get("timeoutSeconds", 120))
            except (ValueError, TypeError):
                timeout = 120
            timeout = max(15, min(timeout, 600))

            deps = s.get("dependsOn") or []
            if not isinstance(deps, list):
                deps = []
            clean_deps = [str(d).strip() for d in deps if str(d).strip() != clean_id]

            sanitized_steps.append(
                DagStep(
                    id=clean_id,
                    name=step_name,
                    type=task_type,
                    queue=queue_name,
                    dependsOn=clean_deps,
                    maxRetries=retries,
                    timeoutSeconds=timeout,
                    configurationJson=s.get("configurationJson"),
                )
            )

        # Ensure all dependsOn only reference valid existing steps
        valid_id_set = {st.id for st in sanitized_steps}
        for st in sanitized_steps:
            st.dependsOn = [d for d in st.dependsOn if d in valid_id_set and d != st.id]

        # Break any cycle if present using Kahn's algorithm
        in_degree = {st.id: len(st.dependsOn) for st in sanitized_steps}
        adj = {st.id: [] for st in sanitized_steps}
        for st in sanitized_steps:
            for dep in st.dependsOn:
                adj[dep].append(st.id)

        from collections import deque
        q = deque([sid for sid, deg in in_degree.items() if deg == 0])
        visited: Set[str] = set()
        while q:
            u = q.popleft()
            visited.add(u)
            for v in adj[u]:
                in_degree[v] -= 1
                if in_degree[v] == 0:
                    q.append(v)

        # If cycles exist (unvisited nodes), remove backwards dependencies
        if len(visited) < len(sanitized_steps):
            for st in sanitized_steps:
                if st.id not in visited:
                    st.dependsOn = [d for d in st.dependsOn if d in visited]
                    visited.add(st.id)

        dag = DagDefinition(steps=sanitized_steps)
        DagEngine.validate_dag(dag)

        return AiGenerateWorkflowResponse(
            name=name,
            description=description,
            dag=dag,
            reasoning=reasoning,
        )

    @classmethod
    def _decompose_business_process_locally(cls, clean_prompt: str) -> AiGenerateWorkflowResponse:
        """High-intelligence domain process decomposition with parallel branching and reliability."""
        lower = clean_prompt.lower()

        # 1. Customer Feedback & Sentiment Analysis
        if any(w in lower for w in ["phân tích", "sentiment", "đánh giá", "review", "feedback", "cảm xúc"]):
            name = "AI-Customer-Feedback-Analyzer"
            desc = "Quy trình AI tự động thu thập đánh giá, phân loại cảm xúc khách hàng và định tuyến xử lý."
            steps = [
                DagStep(id="step-fetch-reviews", name="Fetch Customer Reviews", type=TaskType.HTTP_TASK, queue="default", dependsOn=[], maxRetries=2, timeoutSeconds=30),
                DagStep(id="step-ai-sentiment", name="AI Sentiment & Topic Classification", type=TaskType.AI_AGENT_TASK, queue="ai-agent", dependsOn=["step-fetch-reviews"], maxRetries=2, timeoutSeconds=60),
                # Parallel branches
                DagStep(id="step-ai-summary", name="AI Executive Summary Generation", type=TaskType.AI_AGENT_TASK, queue="ai-agent", dependsOn=["step-ai-sentiment"], maxRetries=2, timeoutSeconds=90),
                DagStep(id="step-alert-escalate", name="Escalate Urgent Issues to Slack", type=TaskType.HTTP_TASK, queue="default", dependsOn=["step-ai-sentiment"], maxRetries=2, timeoutSeconds=30),
                # Fan-in Join
                DagStep(id="step-persist-insights", name="Store Analytics Insights", type=TaskType.WORKER_TASK, queue="data-io", dependsOn=["step-ai-summary", "step-alert-escalate"], maxRetries=3, timeoutSeconds=120),
            ]
            reasoning = "Đã thiết kế quy trình Agentic DAG gồm 5 bước: 2 bước AI Agent (phân loại sentiment & tạo tóm tắt điều hành), kết hợp định tuyến rẽ nhánh (branching) tới Slack và lưu trữ Data-IO."

        # 2. E-commerce Order Fulfillment Saga
        elif any(w in lower for w in ["đơn hàng", "order", "fulfillment", "thương mại", "mua hàng", "bán hàng", "kho", "ship"]):
            name = "Order-Fulfillment-Saga"
            desc = "Quy trình xử lý đơn hàng đa bước: kiểm tra thanh toán & tồn kho song song, đóng gói và giao vận."
            steps = [
                DagStep(id="receive-order", name="Receive Order", type=TaskType.HTTP_TASK, queue="default", dependsOn=[], maxRetries=2, timeoutSeconds=30),
                DagStep(id="validate-order", name="Validate Order", type=TaskType.WORKER_TASK, queue="compute", dependsOn=["receive-order"], maxRetries=2, timeoutSeconds=60),
                # Parallel branches
                DagStep(id="check-payment", name="Check Payment", type=TaskType.WORKER_TASK, queue="payment", dependsOn=["validate-order"], maxRetries=2, timeoutSeconds=45),
                DagStep(id="check-inventory", name="Check Inventory", type=TaskType.WORKER_TASK, queue="data-io", dependsOn=["validate-order"], maxRetries=3, timeoutSeconds=45),
                # Fan-in Join
                DagStep(id="prepare-order", name="Prepare Order", type=TaskType.WORKER_TASK, queue="compute", dependsOn=["check-payment", "check-inventory"], maxRetries=2, timeoutSeconds=120),
                DagStep(id="ship-order", name="Ship Order", type=TaskType.HTTP_TASK, queue="default", dependsOn=["prepare-order"], maxRetries=2, timeoutSeconds=60),
                DagStep(id="notify-customer", name="Notify Customer", type=TaskType.NOTIFICATION, queue="notification", dependsOn=["ship-order"], maxRetries=2, timeoutSeconds=30),
            ]
            reasoning = "Đã thiết kế quy trình xử lý đơn hàng phân tán gồm 7 bước: sau khi kiểm tra đơn, hệ thống tự động rẽ nhánh song song (Branching) để trừ tiền và giữ hàng kho cùng lúc, sau đó hợp nhất để đóng gói, bàn giao vận chuyển và gửi thông báo hoàn tất."

        # 3. Distributed ETL & Data Processing Pipeline
        elif any(w in lower for w in ["etl", "data", "dữ liệu", "kho", "pipeline", "lake"]):
            name = "Smart-Data-Processing-Pipeline"
            desc = "Pipeline xử lý dữ liệu lớn kết hợp AI Data Quality Assessment và tự động tối ưu schema."
            steps = [
                DagStep(id="step-ingest-source", name="Ingest Raw Parquet Data", type=TaskType.WORKER_TASK, queue="data-io", dependsOn=[], maxRetries=3, timeoutSeconds=300),
                DagStep(id="step-ai-quality-check", name="AI Data Quality & Anomaly Detection", type=TaskType.AI_AGENT_TASK, queue="ai-agent", dependsOn=["step-ingest-source"], maxRetries=2, timeoutSeconds=180),
                DagStep(id="step-distributed-transform", name="Distributed Spark/Polars Transform", type=TaskType.WORKER_TASK, queue="compute", dependsOn=["step-ai-quality-check"], maxRetries=2, timeoutSeconds=600),
                DagStep(id="step-load-warehouse", name="Upsert to Analytical Warehouse", type=TaskType.WORKER_TASK, queue="data-io", dependsOn=["step-distributed-transform"], maxRetries=3, timeoutSeconds=300),
                DagStep(id="step-notify-complete", name="Notify Completion & Telemetry", type=TaskType.NOTIFICATION, queue="notification", dependsOn=["step-load-warehouse"], maxRetries=1, timeoutSeconds=30),
            ]
            reasoning = "Pipeline được trang bị bước AI Anomaly Detection giữa giai đoạn nạp thô và biến đổi tính toán, giúp phát hiện sớm dữ liệu dị thường trước khi nạp vào Kho và bắn thông báo hoàn tất."

        # 4. Financial KYC & Credit Underwriting
        elif any(w in lower for w in ["kyc", "vay", "tín dụng", "loan", "hồ sơ", "tài chính", "ngân hàng"]):
            name = "Intelligent-Loan-Origination-Flow"
            desc = "Quy trình thẩm định hồ sơ vay tự động: OCR giấy tờ và tra cứu tín dụng song song, chấm điểm rủi ro bằng AI."
            steps = [
                DagStep(id="step-receive-application", name="Receive Loan Application", type=TaskType.HTTP_TASK, queue="default", dependsOn=[], maxRetries=2, timeoutSeconds=30),
                # Parallel branches
                DagStep(id="step-ocr-id-verification", name="AI OCR & Identity Verification", type=TaskType.AI_AGENT_TASK, queue="ai-agent", dependsOn=["step-receive-application"], maxRetries=2, timeoutSeconds=90),
                DagStep(id="step-credit-bureau-check", name="Query National Credit Bureau (CIC)", type=TaskType.HTTP_TASK, queue="default", dependsOn=["step-receive-application"], maxRetries=3, timeoutSeconds=60),
                # Fan-in Join
                DagStep(id="step-ai-risk-scoring", name="AI Underwriting Risk Scoring", type=TaskType.AI_AGENT_TASK, queue="ai-agent", dependsOn=["step-ocr-id-verification", "step-credit-bureau-check"], maxRetries=2, timeoutSeconds=90),
                DagStep(id="step-persist-decision", name="Persist Underwriting Decision", type=TaskType.WORKER_TASK, queue="data-io", dependsOn=["step-ai-risk-scoring"], maxRetries=3, timeoutSeconds=60),
                DagStep(id="step-notify-applicant", name="Send Decision SMS/Email Notification", type=TaskType.NOTIFICATION, queue="notification", dependsOn=["step-persist-decision"], maxRetries=2, timeoutSeconds=30),
            ]
            reasoning = "Quy trình kết hợp 2 nhánh chạy song song (OCR định danh và tra cứu điểm tín dụng), hợp nhất vào AI chấm điểm rủi ro và tự động gửi thông báo kết quả."

        # 5. General Adaptive Business Decomposition
        else:
            slug = re.sub(r"[^a-zA-Z0-9]+", "-", clean_prompt[:30]).strip("-") or "Custom"
            name = f"Workflow-{slug.title()}"
            desc = f"Quy trình tự động hóa phân tán phân rã nghiệp vụ cho: '{clean_prompt}'"

            steps = [
                DagStep(id="step-ingest-request", name="Ingest Request & Payload Validation", type=TaskType.HTTP_TASK, queue="default", dependsOn=[], maxRetries=2, timeoutSeconds=30),
                # Parallel branches
                DagStep(id="step-ai-semantic-analysis", name="AI Semantic Assessment & Policy Engine", type=TaskType.AI_AGENT_TASK, queue="ai-agent", dependsOn=["step-ingest-request"], maxRetries=2, timeoutSeconds=90),
                DagStep(id="step-business-validation", name="Business Rule & Security Validation", type=TaskType.WORKER_TASK, queue="compute", dependsOn=["step-ingest-request"], maxRetries=3, timeoutSeconds=60),
                # Fan-in Join
                DagStep(id="step-core-execution", name="Distributed Core Processing", type=TaskType.WORKER_TASK, queue="compute", dependsOn=["step-ai-semantic-analysis", "step-business-validation"], maxRetries=3, timeoutSeconds=180),
                DagStep(id="step-persist-state", name="Persist Audit & Transactional State", type=TaskType.WORKER_TASK, queue="data-io", dependsOn=["step-core-execution"], maxRetries=3, timeoutSeconds=120),
                DagStep(id="step-notify-dispatch", name="Dispatch Webhook & Final Notification", type=TaskType.NOTIFICATION, queue="notification", dependsOn=["step-persist-state"], maxRetries=2, timeoutSeconds=30),
            ]
            reasoning = f"Đã thiết kế quy trình 6 bước tối ưu cho '{clean_prompt}': rẽ nhánh song song kiểm tra AI & chính sách nghiệp vụ, hợp nhất xử lý tính toán, lưu trữ trạng thái và gửi thông báo hoàn tất."

        dag = DagDefinition(steps=steps)
        DagEngine.validate_dag(dag)

        return AiGenerateWorkflowResponse(
            name=name,
            description=desc,
            dag=dag,
            reasoning=reasoning,
        )

    @classmethod
    def generate_workflow(cls, prompt: str) -> AiGenerateWorkflowResponse:
        """
        Generates a validated, production-grade DAG workflow from a business prompt.
        Attempts 9Router (OpenAI-compatible AI Gateway) first; gracefully falls back to
        the local business process decomposition engine if 9Router is unavailable.
        """
        if not prompt or not prompt.strip():
            raise AppException.validation("Vui lòng cung cấp mô tả cho quy trình muốn tạo bằng AI.")

        clean_prompt = prompt.strip()

        # 1. Attempt 9Router AI Gateway
        router_resp = cls._call_9router(clean_prompt)
        if router_resp:
            try:
                return cls._sanitize_and_repair_dag(router_resp, clean_prompt)
            except Exception as e:
                logger.warning("Sanitization of 9Router response failed (%s); using intelligent local decomposition.", e)

        # 2. High-intelligence local decomposition engine
        return cls._decompose_business_process_locally(clean_prompt)

    @staticmethod
    def diagnose_failure(instance_id: int, task_id: Optional[int] = None) -> AiDiagnoseFailureResponse:
        instance = store.get_instance(instance_id)
        if not instance:
            raise AppException.not_found(f"Execution #{instance_id}")

        tasks = store.get_tasks_for_instance(instance_id)
        failed_tasks = [t for t in tasks if t.status == StepStatus.FAILED]

        if not failed_tasks and instance.status != "FAILED":
            return AiDiagnoseFailureResponse(
                rootCause="Không phát hiện lỗi nghiêm trọng nào trong lượt chạy này.",
                suggestedFix="Tất cả các task hiện tại đều hoạt động bình thường hoặc đang ở trạng thái chờ/chạy.",
                severity="LOW",
                autoFixable=False
            )

        target_task = None
        if task_id:
            target_task = store.get_task(task_id)
        if not target_task and failed_tasks:
            target_task = failed_tasks[0]

        err_msg = target_task.errorMessage if target_task and target_task.errorMessage else (instance.errorMessage or "Task execution timed out")
        step_name = target_task.stepName if target_task else "Unknown Step"

        # Heuristic AI Diagnostics
        err_lower = err_msg.lower()
        if "timeout" in err_lower or "timed out" in err_lower:
            root_cause = f"Bước '{step_name}' bị vượt quá ngưỡng thời gian chờ cấu hình (Timeout). Nguyên nhân có thể do downstream service quá tải hoặc worker node phản hồi chậm."
            suggested_fix = "1. Tăng timeoutSeconds trong định nghĩa DAG lên 2x.\n2. Kiểm tra độ trễ mạng của Worker node xử lý queue.\n3. Kích hoạt Retry tự động với Exponential Backoff."
            severity = "MEDIUM"
            auto_fixable = True
        elif "connection" in err_lower or "refused" in err_lower or "404" in err_lower:
            root_cause = f"Lỗi kết nối ngoại vi tại bước '{step_name}': Không thể kết nối đến đích API hoặc endpoint từ chối kết nối (Connection Refused / Not Found)."
            suggested_fix = "1. Kiểm tra URL endpoint và thông tin xác thực (API Key/Token).\n2. Xác nhận dịch vụ đích đang ONLINE và tường lửa không chặn cổng.\n3. Kiểm tra lại DNS hostname của worker."
            severity = "HIGH"
            auto_fixable = False
        else:
            root_cause = f"Ngoại lệ runtime xảy ra trong quá trình thực thi bước '{step_name}': {err_msg}."
            suggested_fix = "1. Kiểm tra định dạng dữ liệu trong Input Payload JSON của bước này.\n2. Xem logs chi tiết của Worker node được chỉ định.\n3. Nhấn 'Retry Step' sau khi điều chỉnh tham số đầu vào."
            severity = "HIGH"
            auto_fixable = True

        return AiDiagnoseFailureResponse(
            rootCause=root_cause,
            suggestedFix=suggested_fix,
            severity=severity,
            autoFixable=auto_fixable
        )
