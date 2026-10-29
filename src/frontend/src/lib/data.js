export const USERS = [
  { id: 1, name: "Admin", email: "admin@orchestrator.local", password: "ChangeMe123!", role: "ADMIN", status: "active", phone: "090 123 4567", avatar: "https://i.pravatar.cc/64?img=33", lastActive: "Vừa xong" },
  { id: 2, name: "Operator Lead", email: "operator@orchestrator.local", password: "ChangeMe123!", role: "OPERATOR", status: "active", phone: "090 222 3333", avatar: "https://i.pravatar.cc/64?img=12", lastActive: "Vừa xong" },
  { id: 3, name: "Workflow Dev", email: "dev@orchestrator.local", password: "ChangeMe123!", role: "DEVELOPER", status: "active", phone: "090 333 4444", avatar: "https://i.pravatar.cc/64?img=11", lastActive: "Vừa xong" },
  { id: 4, name: "Observer", email: "viewer@orchestrator.local", password: "ChangeMe123!", role: "VIEWER", status: "active", phone: "090 555 6666", avatar: "https://i.pravatar.cc/64?img=5", lastActive: "Vừa xong" },
];

export const SAMPLE_WORKFLOWS = [
  {
    id: 1,
    name: "Data-ETL-Pipeline",
    version: 1,
    description: "Distributed batch extract, transform, validate, and load pipeline across multiple worker queues.",
    isActive: true,
    createdBy: 1,
    createdAt: "2026-10-20T08:00:00Z",
    dag: {
      steps: [
        { id: "step-extract", name: "Extract from Data Lake", type: "WORKER_TASK", queue: "data-io", dependsOn: [], maxRetries: 3, timeoutSeconds: 300 },
        { id: "step-transform", name: "Transform & Cleanse", type: "WORKER_TASK", queue: "compute", dependsOn: ["step-extract"], maxRetries: 2, timeoutSeconds: 600 },
        { id: "step-enrich", name: "ML Feature Enrichment", type: "WORKER_TASK", queue: "ml-worker", dependsOn: ["step-transform"], maxRetries: 2, timeoutSeconds: 900 },
        { id: "step-load", name: "Load to Warehouse", type: "WORKER_TASK", queue: "data-io", dependsOn: ["step-enrich"], maxRetries: 3, timeoutSeconds: 300 },
        { id: "step-notify", name: "Send Webhook Alert", type: "HTTP_TASK", queue: "default", dependsOn: ["step-load"], maxRetries: 1, timeoutSeconds: 30 }
      ]
    }
  },
  {
    id: 2,
    name: "Order-Fulfillment-Saga",
    version: 1,
    description: "Distributed e-commerce order saga: payment validation, inventory allocation, shipment dispatch.",
    isActive: true,
    createdBy: 1,
    createdAt: "2026-10-22T09:30:00Z",
    dag: {
      steps: [
        { id: "step-validate-fraud", name: "Fraud & Risk Assessment", type: "HTTP_TASK", queue: "default", dependsOn: [], maxRetries: 2, timeoutSeconds: 15 },
        { id: "step-charge-card", name: "Charge Customer Card", type: "WORKER_TASK", queue: "payment", dependsOn: ["step-validate-fraud"], maxRetries: 3, timeoutSeconds: 30 },
        { id: "step-reserve-stock", name: "Reserve Warehouse Stock", type: "WORKER_TASK", queue: "inventory", dependsOn: ["step-charge-card"], maxRetries: 3, timeoutSeconds: 60 },
        { id: "step-create-invoice", name: "Generate PDF Invoice", type: "WORKER_TASK", queue: "documents", dependsOn: ["step-reserve-stock"], maxRetries: 2, timeoutSeconds: 45 },
        { id: "step-dispatch", name: "Notify Shipping Carrier", type: "WORKER_TASK", queue: "logistics", dependsOn: ["step-reserve-stock"], maxRetries: 3, timeoutSeconds: 60 }
      ]
    }
  }
];

export const SAMPLE_WORKERS = [
  { id: 1, workerId: "worker-node-compute-01", hostname: "node-01.orchestrator.cluster", status: "ONLINE", supportedQueues: ["default", "compute", "data-io"], currentLoad: 2, maxConcurrency: 16, lastHeartbeatAt: new Date().toISOString() },
  { id: 2, workerId: "worker-node-compute-02", hostname: "node-02.orchestrator.cluster", status: "ONLINE", supportedQueues: ["default", "compute", "ml-worker"], currentLoad: 1, maxConcurrency: 16, lastHeartbeatAt: new Date().toISOString() },
  { id: 3, workerId: "worker-node-payments-01", hostname: "node-03.orchestrator.cluster", status: "ONLINE", supportedQueues: ["payment", "inventory", "logistics"], currentLoad: 0, maxConcurrency: 8, lastHeartbeatAt: new Date().toISOString() }
];

export const SAMPLE_EXECUTIONS = [
  {
    id: 1001,
    workflowId: 1,
    workflowName: "Data-ETL-Pipeline",
    version: 1,
    status: "RUNNING",
    inputPayloadJson: '{"batchId":"batch-20261029-01","partitions":16}',
    contextDataJson: "{}",
    startedAt: "2026-10-29T10:00:00Z",
    completedAt: null,
    createdAt: "2026-10-29T10:00:00Z",
    tasks: [
      { id: 1, stepId: "step-extract", stepName: "Extract from Data Lake", status: "COMPLETED", queueName: "data-io", retryCount: 0, assignedWorkerId: "worker-node-compute-01" },
      { id: 2, stepId: "step-transform", stepName: "Transform & Cleanse", status: "COMPLETED", queueName: "compute", retryCount: 0, assignedWorkerId: "worker-node-compute-01" },
      { id: 3, stepId: "step-enrich", stepName: "ML Feature Enrichment", status: "RUNNING", queueName: "ml-worker", retryCount: 0, assignedWorkerId: "worker-node-compute-02" },
      { id: 4, stepId: "step-load", stepName: "Load to Warehouse", status: "PENDING", queueName: "data-io", retryCount: 0, assignedWorkerId: null },
      { id: 5, stepId: "step-notify", name: "Send Webhook Alert", status: "PENDING", queueName: "default", retryCount: 0, assignedWorkerId: null }
    ]
  },
  {
    id: 1002,
    workflowId: 2,
    workflowName: "Order-Fulfillment-Saga",
    version: 1,
    status: "COMPLETED",
    inputPayloadJson: '{"orderId":"ORD-98231","amount":125.50,"currency":"USD"}',
    contextDataJson: '{"transactionId":"TX-5512"}',
    startedAt: "2026-10-29T09:15:00Z",
    completedAt: "2026-10-29T09:16:30Z",
    createdAt: "2026-10-29T09:15:00Z",
    tasks: [
      { id: 6, stepId: "step-validate-fraud", stepName: "Fraud & Risk Assessment", status: "COMPLETED", queueName: "default", retryCount: 0, assignedWorkerId: "system" },
      { id: 7, stepId: "step-charge-card", stepName: "Charge Customer Card", status: "COMPLETED", queueName: "payment", retryCount: 0, assignedWorkerId: "worker-node-payments-01" },
      { id: 8, stepId: "step-reserve-stock", stepName: "Reserve Warehouse Stock", status: "COMPLETED", queueName: "inventory", retryCount: 0, assignedWorkerId: "worker-node-payments-01" },
      { id: 9, stepId: "step-create-invoice", stepName: "Generate PDF Invoice", status: "COMPLETED", queueName: "documents", retryCount: 0, assignedWorkerId: "worker-node-compute-01" },
      { id: 10, stepId: "step-dispatch", stepName: "Notify Shipping Carrier", status: "COMPLETED", queueName: "logistics", retryCount: 0, assignedWorkerId: "worker-node-payments-01" }
    ]
  }
];

export const AUDIT_LOGS = [
  { id: 1, action: "TRIGGER", module: "WORKFLOW", detail: "Triggered execution #1001 for workflow 'Data-ETL-Pipeline'", actorUserId: 1, createdAt: "2026-10-29T10:00:00Z" },
  { id: 2, action: "CREATE", module: "WORKFLOW", detail: "Created workflow definition 'Order-Fulfillment-Saga' v1", actorUserId: 1, createdAt: "2026-10-22T09:30:00Z" },
  { id: 3, action: "LOGIN", module: "AUTH", detail: "User admin@orchestrator.local signed in", actorUserId: 1, createdAt: "2026-10-29T08:00:00Z" }
];
