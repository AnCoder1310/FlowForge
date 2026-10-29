import json
import time
from app.domain.models import CompleteTaskRequest, PollTaskRequest, TriggerWorkflowRequest, UserAccount, UserRole
from app.persistence.store import store
from app.services.execution_service import ExecutionService
from app.services.worker_service import WorkerService
from app.services.ai_service import AiOrchestratorService

def run_simulation():
    print("======================================================================")
    print("  🚀 DISTRIBUTED WORKFLOW ORCHESTRATION PLATFORM — LIVE SIMULATION")
    print("======================================================================")
    
    # 1. User Context
    admin = store.get_user_by_id(1)
    print(f"\n[1] Xác thực Actor: {admin.fullName} (Role: {admin.role.value})")

    # 2. AI DAG Generation
    print("\n[2] ✨ Gọi AI Orchestrator: Tự động thiết kế DAG bằng ngôn ngữ tự nhiên...")
    prompt = "Quy trình AI phân tích đánh giá khách hàng và gửi cảnh báo Slack"
    ai_wf = AiOrchestratorService.generate_workflow(prompt)
    print(f"   -> AI tạo workflow: '{ai_wf.name}'")
    print(f"   -> Lý do thiết kế (Reasoning): {ai_wf.reasoning}")
    print(f"   -> Cấu trúc DAG gồm {len(ai_wf.dag.steps)} bước:")
    for idx, s in enumerate(ai_wf.dag.steps):
        print(f"      Step {idx+1}: [{s.type.value}] {s.name} (Queue: '{s.queue}', DependsOn: {s.dependsOn})")

    # Save to store
    from app.domain.models import WorkflowDefinition
    from datetime import datetime, timezone
    now = datetime.now(timezone.utc)
    wf = store.add_workflow(WorkflowDefinition(
        id=0, name=ai_wf.name, version=1, description=ai_wf.description,
        dag=ai_wf.dag, isActive=True, createdBy=admin.id, createdAt=now, updatedAt=now
    ))

    # 3. Trigger Workflow Run
    print(f"\n[3] ⚡ Kích hoạt lượt chạy (Trigger Run) cho Workflow #{wf.id}...")
    req = TriggerWorkflowRequest(inputPayloadJson=json.dumps({"reviewText": "Sản phẩm dùng rất tốt, giao hàng cực nhanh!", "rating": 5}))
    instance = ExecutionService.trigger_workflow(wf.id, req, admin)
    print(f"   -> Khởi tạo Execution Instance #{instance.id} (Status: {instance.status.value})")
    print(f"   -> Đã lập lịch các bước khởi đầu:")
    for t in instance.tasks:
        print(f"      * Task #{t.id}: '{t.stepName}' -> Status: {t.status.value} (Queue: {t.queueName})")

    # 4. Worker Polling
    print(f"\n[4] 🤖 Distributed Worker 'worker-node-compute-01' gửi request kéo task (Poll)...")
    poll_resp = WorkerService.poll_task(PollTaskRequest(workerId="worker-node-compute-01", queues=["default", "data-io", "ai-agent"]))
    if poll_resp.task:
        polled_task = poll_resp.task
        print(f"   -> Nhận Task #{polled_task.id}: '{polled_task.stepName}' (Queue: {polled_task.queueName})")
        print(f"   -> Trạng thái task chuyển thành: {polled_task.status.value} (Assigned to: {polled_task.assignedWorkerId})")

        # 5. Worker Processing & Completing Task
        print(f"\n[5] ⚙️ Worker đang xử lý tác vụ...")
        time.sleep(0.3)
        output_payload = json.dumps({"statusCode": 200, "reviewsFetched": 1, "status": "SUCCESS"})
        print(f"   -> Worker hoàn thành task, gửi output payload...")
        completed_task = ExecutionService.complete_task(polled_task.id, CompleteTaskRequest(outputPayloadJson=output_payload))
        print(f"   -> Task #{completed_task.id} hoàn tất: {completed_task.status.value}")

        # 6. Check DAG State Advancement
        print(f"\n[6] 🔄 DAG Engine tự động giải phóng các bước tiếp theo...")
        detail = ExecutionService.get_execution_detail(instance.id)
        for t in detail["tasks"]:
            icon = "✅" if t.status.value == "COMPLETED" else "⏳" if t.status.value == "SCHEDULED" else "⏱️"
            print(f"      {icon} Task #{t.id} '{t.stepName}': [{t.status.value}] (Queue: {t.queueName})")

    print("\n======================================================================")
    print("  🎉 MÔ PHỎNG THỰC THI WORKFLOW PHÂN TÁN ĐÃ HOÀN TẤT THÀNH CÔNG!")
    print("======================================================================")

if __name__ == "__main__":
    run_simulation()
