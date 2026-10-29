import json
import os
import re
from typing import Optional
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

class AiOrchestratorService:
    @staticmethod
    def generate_workflow(prompt: str) -> AiGenerateWorkflowResponse:
        if not prompt or not prompt.strip():
            raise AppException.validation("Vui lòng cung cấp mô tả cho quy trình muốn tạo bằng AI.")

        clean_prompt = prompt.strip()
        lower_prompt = clean_prompt.lower()

        # Generate intelligent contextual DAG based on prompt intent
        if any(w in lower_prompt for w in ["ai", "llm", "phân tích", "sentiment", "đánh giá", "review"]):
            name = "AI-Customer-Feedback-Analyzer"
            desc = "Quy trình AI tự động thu thập đánh giá, phân loại cảm xúc khách hàng và định tuyến xử lý."
            steps = [
                DagStep(id="step-fetch-reviews", name="Fetch Customer Reviews", type=TaskType.HTTP_TASK, queue="default", dependsOn=[], maxRetries=2, timeoutSeconds=30),
                DagStep(id="step-ai-sentiment", name="AI Sentiment & Topic Classification", type=TaskType.AI_AGENT_TASK, queue="ai-agent", dependsOn=["step-fetch-reviews"], maxRetries=2, timeoutSeconds=60),
                DagStep(id="step-ai-summary", name="AI Executive Summary Generation", type=TaskType.AI_AGENT_TASK, queue="ai-agent", dependsOn=["step-ai-sentiment"], maxRetries=2, timeoutSeconds=90),
                DagStep(id="step-alert-escalate", name="Escalate Urgent Issues to Slack", type=TaskType.HTTP_TASK, queue="default", dependsOn=["step-ai-sentiment"], maxRetries=3, timeoutSeconds=30),
                DagStep(id="step-persist-insights", name="Store Analytics Insights", type=TaskType.WORKER_TASK, queue="data-io", dependsOn=["step-ai-summary", "step-alert-escalate"], maxRetries=3, timeoutSeconds=120),
            ]
            reasoning = "Đã thiết kế quy trình Agentic DAG gồm 5 bước: 2 bước AI Agent (phân loại sentiment & tạo tóm tắt điều hành), kết hợp định tuyến rẽ nhánh (branching) tới Slack và lưu trữ Data-IO."

        elif any(w in lower_prompt for w in ["etl", "data", "dữ liệu", "kho", "pipeline"]):
            name = "Smart-Data-Processing-Pipeline"
            desc = "Pipeline xử lý dữ liệu lớn kết hợp AI Data Quality Assessment và tự động tối ưu schema."
            steps = [
                DagStep(id="step-ingest-source", name="Ingest Raw Parquet Data", type=TaskType.WORKER_TASK, queue="data-io", dependsOn=[], maxRetries=3, timeoutSeconds=300),
                DagStep(id="step-ai-quality-check", name="AI Data Quality & Anomaly Detection", type=TaskType.AI_AGENT_TASK, queue="ai-agent", dependsOn=["step-ingest-source"], maxRetries=2, timeoutSeconds=180),
                DagStep(id="step-distributed-transform", name="Distributed Spark/Polars Transform", type=TaskType.WORKER_TASK, queue="compute", dependsOn=["step-ai-quality-check"], maxRetries=2, timeoutSeconds=600),
                DagStep(id="step-load-warehouse", name="Upsert to Analytical Warehouse", type=TaskType.WORKER_TASK, queue="data-io", dependsOn=["step-distributed-transform"], maxRetries=3, timeoutSeconds=300),
            ]
            reasoning = "Pipeline được trang bị bước AI Anomaly Detection giữa giai đoạn nạp thô và biến đổi tính toán, giúp phát hiện sớm dữ liệu dị thường trước khi nạp vào Kho."

        elif any(w in lower_prompt for w in ["vay", "ngân hàng", "tài chính", "onboarding", "kyc"]):
            name = "AI-Powered-Loan-Approval-Flow"
            desc = "Quy trình tự động xét duyệt hồ sơ tín dụng với AI OCR & Khảo sát rủi ro gian lận."
            steps = [
                DagStep(id="step-ocr-documents", name="AI OCR & Identity Extraction", type=TaskType.AI_AGENT_TASK, queue="ai-agent", dependsOn=[], maxRetries=2, timeoutSeconds=60),
                DagStep(id="step-credit-bureau", name="Query National Credit Database", type=TaskType.HTTP_TASK, queue="default", dependsOn=["step-ocr-documents"], maxRetries=3, timeoutSeconds=45),
                DagStep(id="step-ai-risk-scoring", name="AI Risk Assessment & Underwriting", type=TaskType.AI_AGENT_TASK, queue="ai-agent", dependsOn=["step-credit-bureau"], maxRetries=2, timeoutSeconds=90),
                DagStep(id="step-decision-dispatch", name="Dispatch Loan Contract & Notification", type=TaskType.HTTP_TASK, queue="default", dependsOn=["step-ai-risk-scoring"], maxRetries=3, timeoutSeconds=30),
            ]
            reasoning = "Quy trình sử dụng mô hình AI kết hợp OCR nhận diện hồ sơ và chấm điểm rủi ro tự động, rút ngắn thời gian phê duyệt xuống còn dưới 3 phút."

        else:
            # General Adaptive DAG
            slug = re.sub(r"[^a-zA-Z0-9]+", "-", clean_prompt[:25]).strip("-") or "Custom"
            name = f"Workflow-{slug.title()}"
            desc = f"Quy trình tự động hóa phân tán được thiết kế theo yêu cầu: '{clean_prompt}'"
            steps = [
                DagStep(id="step-init", name="Validate & Prepare Context", type=TaskType.SYSTEM_TASK, queue="default", dependsOn=[], maxRetries=2, timeoutSeconds=30),
                DagStep(id="step-ai-analyze", name="AI Semantic Processing & Decision", type=TaskType.AI_AGENT_TASK, queue="ai-agent", dependsOn=["step-init"], maxRetries=2, timeoutSeconds=90),
                DagStep(id="step-worker-execute", name="Distributed Worker Execution", type=TaskType.WORKER_TASK, queue="compute", dependsOn=["step-ai-analyze"], maxRetries=3, timeoutSeconds=180),
                DagStep(id="step-finalize-notify", name="Finalize State & Send Webhook", type=TaskType.HTTP_TASK, queue="default", dependsOn=["step-worker-execute"], maxRetries=2, timeoutSeconds=30),
            ]
            reasoning = f"Đã sinh cấu trúc DAG 4 bước tối ưu cho tác vụ '{clean_prompt}', tích hợp AI Agent để ra quyết định trung gian trước khi bàn giao cho compute worker."

        dag = DagDefinition(steps=steps)
        DagEngine.validate_dag(dag)

        return AiGenerateWorkflowResponse(
            name=name,
            description=desc,
            dag=dag,
            reasoning=reasoning
        )

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
