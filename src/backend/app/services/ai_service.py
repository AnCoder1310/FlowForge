import json
import logging
import re
from datetime import datetime, timezone
from typing import Dict, List, Optional, Set
import httpx

from app.config import settings
from app.core.exceptions import AppException
from app.domain.dag_engine import DagEngine
from app.domain.dag_validation import DagIntegrityValidator
from app.domain.models import (
    AiDiagnoseFailureResponse,
    AiGenerateWorkflowResponse,
    DagDefinition,
    DagStep,
    StepStatus,
    TaskType,
    WorkflowDefinition,
)
from app.persistence.store import store

logger = logging.getLogger(__name__)

# Supported backend task types and worker queues
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

SYSTEM_PROMPT = """You are an expert Distributed Systems Architect for FlowForge (FlowForge- DWOP).
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

6. Dependency Integrity:
   - Step IDs must be unique strings (kebab-case, e.g. "step-fetch-reviews").
   - Every ID in `dependsOn` must exist in the steps array.
   - A step must never depend on itself.
   - Preserve every dependency explicitly required by the user; never remove, add, or reverse one to make the graph acyclic.
   - If the user's explicit dependencies form a cycle, return those exact dependencies. The server will reject the DAG instead of repairing it.
   - Only generate an acyclic graph when the business dependencies themselves are acyclic.

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

DIAGNOSE_SYSTEM_PROMPT = """You are an expert Reliability & Site Reliability Engineer (SRE) for FlowForge Distributed Workflow Orchestration Platform.
Your task is to analyze failed workflow executions, diagnose the exact root cause, and provide actionable, production-ready remediation advice.

CRITICAL INSTRUCTIONS:
- Analyze the failed step name, queue, error message, execution payload, and contextual parameters.
- Provide a clear, technical Root Cause Analysis (rootCause).
- Provide concrete, numbered remediation steps for operations engineers (suggestedFix).
- Assign an accurate severity level: "LOW", "MEDIUM", "HIGH", or "CRITICAL".
- Determine if the issue is auto-fixable via retry/parameter adjust (autoFixable: boolean).

Respond with pure valid JSON ONLY:
{
  "rootCause": "Clear explanation of why this step or workflow failed...",
  "suggestedFix": "1. First action step...\\n2. Second action step...\\n3. Verification...",
  "severity": "HIGH",
  "autoFixable": true
}
"""


class AiOrchestratorService:
    @classmethod
    def _resolve_provider_config(cls) -> dict:
        """
        Resolves provider URL, API key, model and timeout from application settings.
        Validates configuration without hardcoding sensitive secrets.
        """
        if not settings.AI_ENABLED:
            raise AppException.service_unavailable(
                "Tính năng AI Copilot hiện đang bị tắt bởi cấu hình hệ thống (AI_ENABLED=false)."
            )

        # 1. Base URL & Key resolution
        if settings.OPENAI_API_KEY and not settings.ROUTER_KEY:
            base_url = settings.OPENAI_BASE_URL or "https://api.openai.com/v1"
            api_key = settings.OPENAI_API_KEY
            default_model = settings.AI_MODEL or "gpt-4o-mini"
        else:
            base_url = settings.ROUTER_BASE_URL or "http://localhost:20128/v1"
            api_key = settings.ROUTER_KEY or settings.OPENAI_API_KEY
            default_model = settings.AI_MODEL or "gemini"

        if not api_key:
            raise AppException.service_unavailable(
                "Chưa cấu hình API Key cho AI Gateway / Provider. "
                "Vui lòng thiết lập ROUTER_KEY hoặc OPENAI_API_KEY trong file .env."
            )

        return {
            "base_url": base_url.rstrip("/"),
            "api_key": api_key,
            "default_model": default_model,
            "timeout": settings.AI_TIMEOUT,
        }

    @classmethod
    def _parse_llm_json(cls, raw_content: str) -> dict:
        """
        Robust JSON extractor: strips markdown code fences, extracts outer JSON braces,
        repairs common trailing commas, and parses valid dict.
        """
        content = raw_content.strip()

        # 1. Strip markdown fences: ```json ... ``` or ``` ... ```
        if content.startswith("```"):
            content = re.sub(r"^```(?:json)?\s*", "", content, flags=re.IGNORECASE)
            content = re.sub(r"\s*```$", "", content)
            content = content.strip()

        # 2. Extract outermost JSON object if there is leading/trailing text
        brace_start = content.find("{")
        brace_end = content.rfind("}")
        if brace_start != -1 and brace_end != -1 and brace_end > brace_start:
            content = content[brace_start : brace_end + 1].strip()

        # 3. Clean common trailing commas before closing braces/brackets
        content = re.sub(r",\s*([\}\]])", r"\1", content)

        try:
            parsed = json.loads(content)
            if isinstance(parsed, dict):
                return parsed
            raise ValueError("Parsed JSON root must be a dictionary.")
        except Exception as e:
            logger.error("Failed to parse JSON response from LLM: %s. Raw: %s", e, raw_content[:300])
            raise AppException.validation(
                f"AI Provider trả về định dạng JSON không hợp lệ: {str(e)}. "
                f"Nội dung nhận được: {raw_content[:150]}"
            )

    @classmethod
    def _call_llm(
        cls,
        system_prompt: str,
        user_prompt: str,
        preferred_model: Optional[str] = None,
    ) -> dict:
        """
        Invokes OpenAI-compatible chat completions endpoint (9Router / OpenAI / Antigravity Gateway).
        Prioritizes fast low-thinking models, guards against single-model timeouts,
        and cycles through candidate models before failing.
        """
        cfg = cls._resolve_provider_config()
        base_url = cfg["base_url"]
        api_key = cfg["api_key"]
        timeout = cfg["timeout"]
        primary_model = preferred_model or cfg["default_model"]

        # Prepare ordered candidate models
        candidate_models = [primary_model]
        if "20128" in base_url or "router" in base_url.lower():
            # Fast, low-latency models first to prevent Gateway Timeout
            router_defaults = [
                "gemini-3.8-flash-high",
                "gemini-3.6-flash-high",
                "gemini",
                "claude-opus-4-6-thinking",
                "claude",
                "openAI",
                "mixed",
            ]
            for m in router_defaults:
                if m not in candidate_models:
                    candidate_models.append(m)

        url = f"{base_url}/chat/completions"
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }

        last_error: Optional[str] = None
        had_timeout: bool = False

        for model in candidate_models:
            payload = {
                "model": model,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                "temperature": 0.2,
                "max_tokens": 2500,
                "stream": False,
            }

            try:
                with httpx.Client(timeout=timeout) as client:
                    res = client.post(url, json=payload, headers=headers)

                if res.status_code == 200:
                    raw_text = res.text.strip()
                    if not raw_text:
                        last_error = f"Model '{model}' returned empty HTTP 200 body"
                        continue
                    try:
                        data = res.json()
                    except Exception as json_err:
                        last_error = f"Model '{model}' response is not JSON ({str(json_err)}): {raw_text[:120]}"
                        continue

                    choices = data.get("choices", [])
                    if not choices:
                        last_error = f"Model '{model}': choices list is empty"
                        logger.warning("AI Provider (%s) returned empty choices for model %s", base_url, model)
                        continue

                    msg = choices[0].get("message", {})
                    content = (
                        msg.get("content")
                        or msg.get("reasoning_content")
                        or msg.get("thought")
                        or choices[0].get("text")
                        or ""
                    )
                    if not content.strip():
                        last_error = f"Model '{model}': message content is empty"
                        continue

                    return cls._parse_llm_json(content)

                elif res.status_code in (401, 403):
                    raise AppException.unauthorized(
                        f"Xác thực thất bại với AI Provider (HTTP {res.status_code}). "
                        "Vui lòng kiểm tra lại ROUTER_KEY hoặc OPENAI_API_KEY trong file .env."
                    )
                elif res.status_code in (404, 400, 502, 503):
                    last_error = f"Model '{model}' HTTP {res.status_code}: {res.text[:180]}"
                    logger.warning("AI Provider model '%s' rejected (HTTP %s), trying next candidate: %s", model, res.status_code, last_error)
                    continue
                else:
                    last_error = f"Model '{model}' HTTP {res.status_code}: {res.text[:180]}"
                    continue

            except (httpx.ConnectError, httpx.ConnectTimeout) as e:
                logger.error("AI Provider ConnectError at %s: %s", url, e)
                raise AppException.service_unavailable(
                    f"Không thể kết nối đến AI Gateway tại '{base_url}'. "
                    "Vui lòng kiểm tra dịch vụ 9Router hoặc OpenAI API đã được khởi động."
                )
            except httpx.TimeoutException as e:
                had_timeout = True
                last_error = f"Model '{model}' timed out after {timeout}s"
                logger.warning("AI Provider candidate '%s' timed out after %ss, trying next candidate...", model, timeout)
                continue
            except AppException:
                raise
            except Exception as e:
                logger.error("Unexpected error invoking candidate model '%s': %s", model, e)
                last_error = f"Model '{model}' exception: {str(e)}"
                continue

        if had_timeout:
            raise AppException.gateway_timeout(
                f"AI Provider phản hồi vượt quá thời gian chờ ({timeout}s). "
                f"Vui lòng thử lại hoặc tăng AI_TIMEOUT trong file .env. Lỗi gần nhất: {last_error}"
            )

        raise AppException.bad_gateway(
            f"Không có model nào phản hồi thành công trên AI Gateway ({base_url}). Lỗi gần nhất: {last_error}"
        )

    @classmethod
    def _normalize_and_validate_dag(cls, raw: dict, prompt: str) -> AiGenerateWorkflowResponse:
        """
        Normalize task metadata without changing IDs or dependency edges, then validate the DAG.
        """
        name = str(raw.get("name") or "Workflow-Generated").strip()
        description = str(raw.get("description") or f"Quy trình tự động hóa: {prompt}").strip()
        reasoning = str(
            raw.get("reasoning")
            or "Đã phân rã quy trình thành các bước độc lập với nhánh song song và xử lý tin cậy."
        ).strip()

        dag_raw = raw.get("dag") or {}
        raw_steps = dag_raw.get("steps") if isinstance(dag_raw, dict) else []
        if not raw_steps or not isinstance(raw_steps, list):
            raise AppException.validation("AI không tạo được danh sách bước (steps) hợp lệ cho workflow.")

        normalized_steps: List[DagStep] = []
        for idx, s in enumerate(raw_steps):
            if not isinstance(s, dict):
                raise AppException.validation(f"AI generated an invalid task at position {idx + 1}.")

            raw_id = s.get("id")
            if not isinstance(raw_id, str) or not raw_id or raw_id != raw_id.strip():
                raise AppException.validation(f"AI generated an invalid task ID at position {idx + 1}.")
            clean_id = raw_id

            step_name = str(s.get("name") or f"Step {idx+1}").strip()

            # Task Type Classification
            raw_type = str(s.get("type") or "WORKER_TASK").strip().upper()
            if raw_type in {t.value for t in ALLOWED_TASK_TYPES}:
                task_type = TaskType(raw_type)
            elif any(k in raw_type for k in ["HTTP", "API", "WEBHOOK", "REST"]):
                task_type = TaskType.HTTP_TASK
            elif any(k in raw_type for k in ["AI", "AGENT", "LLM", "SENTIMENT", "OCR", "ANALYSIS"]):
                task_type = TaskType.AI_AGENT_TASK
            elif any(k in raw_type for k in ["NOTIF", "ALERT", "SLACK", "EMAIL", "SMS", "PUSH"]):
                task_type = TaskType.NOTIFICATION
            else:
                task_type = TaskType.WORKER_TASK

            # Queue Assignment
            raw_queue = str(s.get("queue") or "default").strip().lower()
            if raw_queue in SUPPORTED_QUEUES:
                queue_name = raw_queue
            else:
                # Default mapping based on task type and semantics
                if task_type == TaskType.AI_AGENT_TASK:
                    queue_name = "ai-agent"
                elif task_type == TaskType.NOTIFICATION:
                    queue_name = "notification"
                elif task_type == TaskType.HTTP_TASK:
                    queue_name = "default"
                elif any(k in step_name.lower() for k in ["payment", "charge", "thanh toán", "billing"]):
                    queue_name = "payment"
                elif any(k in step_name.lower() for k in ["database", "db", "store", "persist", "kho", "lưu", "sql"]):
                    queue_name = "data-io"
                elif any(k in step_name.lower() for k in ["inventory", "tồn kho"]):
                    queue_name = "inventory"
                elif any(k in step_name.lower() for k in ["ship", "logistics", "vận chuyển"]):
                    queue_name = "logistics"
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

            deps = s.get("dependsOn", [])
            if deps is None:
                deps = []
            if not isinstance(deps, list) or any(not isinstance(dep, str) for dep in deps):
                raise AppException.validation(f"AI generated invalid dependencies for task '{clean_id}'.")

            normalized_steps.append(
                DagStep(
                    id=clean_id,
                    name=step_name,
                    type=task_type,
                    queue=queue_name,
                    dependsOn=deps,
                    maxRetries=retries,
                    timeoutSeconds=timeout,
                    configurationJson=s.get("configurationJson"),
                )
            )

        if not normalized_steps:
            raise AppException.validation("Không có bước hợp lệ nào được tạo từ AI.")

        dag = DagDefinition(steps=normalized_steps)
        DagIntegrityValidator.validate_dependency_preservation(raw_steps, dag)
        cls._validate_prompt_dependencies(prompt, dag)
        DagEngine.validate_dag(dag)

        return AiGenerateWorkflowResponse(
            name=name,
            description=description,
            dag=dag,
            reasoning=reasoning,
        )

    @staticmethod
    def _validate_prompt_dependencies(prompt: str, dag: DagDefinition) -> None:
        relationship = r"(?:depends\s+on|depends\s+upon|is\s+dependent\s+on|requires|phụ\s+thuộc\s+vào)"

        def aliases(value: str) -> Set[str]:
            normalized = re.sub(r"[-_]+", " ", value.casefold()).strip()
            return {normalized, re.sub(r"\s+", " ", normalized)}

        for step in dag.steps:
            for dependency in dag.steps:
                if step.id == dependency.id:
                    continue
                explicit = any(
                    re.search(
                        rf"(?<!\w){re.escape(dependent_alias)}\s+{relationship}\s+"
                        rf"{re.escape(dependency_alias)}(?!\w)",
                        prompt,
                        flags=re.IGNORECASE,
                    )
                    for dependent_alias in aliases(step.name) | aliases(step.id)
                    for dependency_alias in aliases(dependency.name) | aliases(dependency.id)
                )
                if explicit and dependency.id not in step.dependsOn:
                    raise AppException.validation(
                        f"AI DAG omitted required dependency: '{step.name}' depends on "
                        f"'{dependency.name}'. The dependency was not added automatically."
                    )

    @classmethod
    def generate_workflow(
        cls,
        prompt: str,
        auto_save: bool = False,
        actor_user_id: Optional[int] = None,
    ) -> AiGenerateWorkflowResponse:
        """
        Generates a validated, production-grade DAG workflow from a natural language business prompt
        via a real LLM Provider (9Router / OpenAI / Antigravity Gateway).
        Never returns a silent mock response when the LLM is down.
        Optionally persists the generated workflow into the database if auto_save is True.
        """
        if not prompt or not prompt.strip():
            raise AppException.validation("Vui lòng cung cấp mô tả cho quy trình muốn tạo bằng AI.")

        clean_prompt = prompt.strip()

        # 1. Invoke Real LLM Provider
        llm_raw = cls._call_llm(SYSTEM_PROMPT, clean_prompt)

        # 2. Normalize metadata and validate dependency integrity and acyclicity
        response = cls._normalize_and_validate_dag(llm_raw, clean_prompt)

        # 3. Optional Auto-Save to Database
        if auto_save:
            now = datetime.now(timezone.utc)
            creator_id = actor_user_id or 1
            wf = store.add_workflow(
                WorkflowDefinition(
                    id=0,
                    name=response.name,
                    version=1,
                    description=response.description,
                    dag=response.dag,
                    isActive=True,
                    createdBy=creator_id,
                    createdAt=now,
                    updatedAt=now,
                )
            )
            response.workflowId = wf.id
            store.record_audit(
                action="CREATE_WORKFLOW_AI",
                module="AI",
                detail=f"Tự động tạo và lưu Workflow '{wf.name}' (ID: #{wf.id}) từ AI Prompt-to-DAG",
                user_id=creator_id,
            )

        return response

    @classmethod
    def diagnose_failure(
        cls,
        instance_id: int,
        task_id: Optional[int] = None,
    ) -> AiDiagnoseFailureResponse:
        """
        Performs AI-driven Root Cause Analysis (RCA) and Self-Healing remediation
        for failed executions or steps using LLM reasoning, with a resilient heuristic fallback.
        """
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
                autoFixable=False,
            )

        target_task = None
        if task_id:
            target_task = store.get_task(task_id)
        if not target_task and failed_tasks:
            target_task = failed_tasks[0]

        err_msg = (
            target_task.errorMessage
            if target_task and target_task.errorMessage
            else (instance.errorMessage or "Task execution timed out")
        )
        step_name = target_task.stepName if target_task else "Unknown Step"
        step_id = target_task.stepId if target_task else "unknown"
        queue_name = target_task.queueName if target_task else "default"
        retry_count = target_task.retryCount if target_task else 0
        max_retries = target_task.maxRetries if target_task else 3

        # 1. Attempt LLM Diagnosis
        try:
            diag_prompt = f"""Execution Context:
- Workflow Name: {instance.workflowName} (Instance #{instance.id})
- Instance Status: {instance.status}
- Failed Step Name: {step_name} (ID: {step_id})
- Queue Name: {queue_name}
- Retries: {retry_count}/{max_retries}
- Error Message: {err_msg}
- Input Payload: {instance.inputPayloadJson or 'None'}
- Context Data: {instance.contextDataJson or 'None'}

Please provide a precise Root Cause Analysis and Self-Healing recommendations in JSON."""

            parsed = cls._call_llm(DIAGNOSE_SYSTEM_PROMPT, diag_prompt)
            root_cause = str(parsed.get("rootCause") or f"Lỗi thực thi bước '{step_name}': {err_msg}").strip()
            suggested_fix = str(parsed.get("suggestedFix") or "Kiểm tra worker node và tham số đầu vào.").strip()
            severity = str(parsed.get("severity") or "HIGH").strip().upper()
            if severity not in ("LOW", "MEDIUM", "HIGH", "CRITICAL"):
                severity = "HIGH"
            auto_fixable = bool(parsed.get("autoFixable", True))

            return AiDiagnoseFailureResponse(
                rootCause=root_cause,
                suggestedFix=suggested_fix,
                severity=severity,
                autoFixable=auto_fixable,
            )
        except Exception as e:
            logger.warning("LLM Diagnosis unavailable (%s), using structured heuristic diagnostics.", e)

        # 2. Resilient Heuristic Fallback
        err_lower = err_msg.lower()
        if "timeout" in err_lower or "timed out" in err_lower:
            root_cause = (
                f"Bước '{step_name}' bị vượt quá ngưỡng thời gian chờ cấu hình (Timeout). "
                "Nguyên nhân có thể do downstream service quá tải hoặc worker node phản hồi chậm."
            )
            suggested_fix = (
                "1. Tăng timeoutSeconds trong định nghĩa DAG lên 2x.\n"
                "2. Kiểm tra độ trễ mạng và hàng đợi của Worker node xử lý queue.\n"
                "3. Kích hoạt Retry tự động với Exponential Backoff."
            )
            severity = "MEDIUM"
            auto_fixable = True
        elif "connection" in err_lower or "refused" in err_lower or "404" in err_lower:
            root_cause = (
                f"Lỗi kết nối ngoại vi tại bước '{step_name}': Không thể kết nối đến đích API "
                "hoặc endpoint từ chối kết nối (Connection Refused / Not Found)."
            )
            suggested_fix = (
                "1. Kiểm tra URL endpoint và thông tin xác thực (API Key/Token).\n"
                "2. Xác nhận dịch vụ đích đang ONLINE và tường lửa không chặn cổng.\n"
                "3. Kiểm tra lại DNS hostname của worker."
            )
            severity = "HIGH"
            auto_fixable = False
        else:
            root_cause = f"Ngoại lệ runtime xảy ra trong quá trình thực thi bước '{step_name}': {err_msg}."
            suggested_fix = (
                "1. Kiểm tra định dạng dữ liệu trong Input Payload JSON của bước này.\n"
                "2. Xem logs chi tiết của Worker node được chỉ định.\n"
                "3. Nhấn 'Retry Step' sau khi điều chỉnh tham số đầu vào."
            )
            severity = "HIGH"
            auto_fixable = True

        return AiDiagnoseFailureResponse(
            rootCause=root_cause,
            suggestedFix=suggested_fix,
            severity=severity,
            autoFixable=auto_fixable,
        )

    @classmethod
    def generate_offline_template(cls, prompt: str) -> AiGenerateWorkflowResponse:
        """
        Explicit offline template generator for simulations and disconnected demonstrations.
        This is never called automatically to conceal LLM provider failures.
        """
        clean_prompt = prompt.strip() if prompt else "Custom Workflow"
        lower = clean_prompt.lower()

        if any(w in lower for w in ["phân tích", "sentiment", "đánh giá", "review", "feedback", "cảm xúc"]):
            name = "AI-Customer-Feedback-Analyzer"
            desc = "Quy trình AI tự động thu thập đánh giá, phân loại cảm xúc khách hàng và định tuyến xử lý."
            steps = [
                DagStep(id="step-fetch-reviews", name="Fetch Customer Reviews", type=TaskType.HTTP_TASK, queue="default", dependsOn=[], maxRetries=2, timeoutSeconds=30),
                DagStep(id="step-ai-sentiment", name="AI Sentiment & Topic Classification", type=TaskType.AI_AGENT_TASK, queue="ai-agent", dependsOn=["step-fetch-reviews"], maxRetries=2, timeoutSeconds=60),
                DagStep(id="step-ai-summary", name="AI Executive Summary Generation", type=TaskType.AI_AGENT_TASK, queue="ai-agent", dependsOn=["step-ai-sentiment"], maxRetries=2, timeoutSeconds=90),
                DagStep(id="step-alert-escalate", name="Escalate Urgent Issues to Slack", type=TaskType.HTTP_TASK, queue="default", dependsOn=["step-ai-sentiment"], maxRetries=2, timeoutSeconds=30),
                DagStep(id="step-persist-insights", name="Store Analytics Insights", type=TaskType.WORKER_TASK, queue="data-io", dependsOn=["step-ai-summary", "step-alert-escalate"], maxRetries=3, timeoutSeconds=120),
            ]
            reasoning = "Đã thiết kế quy trình Agentic DAG gồm 5 bước: 2 bước AI Agent (phân loại sentiment & tạo tóm tắt điều hành), kết hợp định tuyến rẽ nhánh (branching) tới Slack và lưu trữ Data-IO."
        elif any(w in lower for w in ["đơn hàng", "thanh toán", "order", "fulfillment", "thương mại", "kho", "ship"]):
            name = "Order-Fulfillment-Saga"
            desc = "Quy trình xử lý đơn hàng đa bước: kiểm tra thanh toán & tồn kho song song, đóng gói và giao vận."
            steps = [
                DagStep(id="receive-order", name="Receive Order", type=TaskType.HTTP_TASK, queue="default", dependsOn=[], maxRetries=2, timeoutSeconds=30),
                DagStep(id="validate-order", name="Validate Order", type=TaskType.WORKER_TASK, queue="compute", dependsOn=["receive-order"], maxRetries=2, timeoutSeconds=60),
                DagStep(id="check-payment", name="Check Payment", type=TaskType.WORKER_TASK, queue="payment", dependsOn=["validate-order"], maxRetries=2, timeoutSeconds=45),
                DagStep(id="check-inventory", name="Check Inventory", type=TaskType.WORKER_TASK, queue="data-io", dependsOn=["validate-order"], maxRetries=3, timeoutSeconds=45),
                DagStep(id="prepare-order", name="Prepare Order", type=TaskType.WORKER_TASK, queue="compute", dependsOn=["check-payment", "check-inventory"], maxRetries=2, timeoutSeconds=120),
                DagStep(id="ship-order", name="Ship Order", type=TaskType.HTTP_TASK, queue="default", dependsOn=["prepare-order"], maxRetries=2, timeoutSeconds=60),
                DagStep(id="notify-customer", name="Notify Customer", type=TaskType.NOTIFICATION, queue="notification", dependsOn=["ship-order"], maxRetries=2, timeoutSeconds=30),
            ]
            reasoning = "Đã thiết kế quy trình xử lý đơn hàng phân tán gồm 7 bước: kiểm tra đơn hàng, rẽ nhánh song song kiểm tra thanh toán & kho, đóng gói, bàn giao vận chuyển và gửi thông báo."
        else:
            name = "Smart-Data-Processing-Pipeline"
            desc = f"Quy trình xử lý tự động hóa: {clean_prompt}"
            steps = [
                DagStep(id="step-ingest-source", name="Ingest Raw Parquet Data", type=TaskType.WORKER_TASK, queue="data-io", dependsOn=[], maxRetries=3, timeoutSeconds=300),
                DagStep(id="step-ai-quality-check", name="AI Data Quality & Anomaly Detection", type=TaskType.AI_AGENT_TASK, queue="ai-agent", dependsOn=["step-ingest-source"], maxRetries=2, timeoutSeconds=180),
                DagStep(id="step-distributed-transform", name="Distributed Spark/Polars Transform", type=TaskType.WORKER_TASK, queue="compute", dependsOn=["step-ai-quality-check"], maxRetries=2, timeoutSeconds=600),
                DagStep(id="step-load-warehouse", name="Upsert to Analytical Warehouse", type=TaskType.WORKER_TASK, queue="data-io", dependsOn=["step-distributed-transform"], maxRetries=3, timeoutSeconds=300),
                DagStep(id="step-notify-complete", name="Notify Completion & Telemetry", type=TaskType.NOTIFICATION, queue="notification", dependsOn=["step-load-warehouse"], maxRetries=1, timeoutSeconds=30),
            ]
            reasoning = "Pipeline được trang bị bước AI Anomaly Detection giữa giai đoạn nạp thô và biến đổi tính toán, giúp phát hiện sớm dữ liệu dị thường trước khi nạp vào Kho và bắn thông báo."

        dag = DagDefinition(steps=steps)
        DagEngine.validate_dag(dag)
        return AiGenerateWorkflowResponse(name=name, description=desc, dag=dag, reasoning=reasoning)
