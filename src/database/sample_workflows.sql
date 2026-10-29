-- ============================================================
-- Sample Workflows for Distributed Workflow Orchestration Platform
-- ============================================================

SET search_path TO workflow_orchestrator, public;

-- Default Users
INSERT INTO app_users (username, email, password_hash, full_name, role)
VALUES 
    ('admin', 'admin@orchestrator.local', 'AQAAAAEAACcQAAAAEExamplePasswordHash==', 'Platform Administrator', 'ADMIN'),
    ('operator', 'operator@orchestrator.local', 'AQAAAAEAACcQAAAAEExamplePasswordHash==', 'Operations Lead', 'OPERATOR'),
    ('developer', 'dev@orchestrator.local', 'AQAAAAEAACcQAAAAEExamplePasswordHash==', 'Workflow Developer', 'DEVELOPER'),
    ('viewer', 'viewer@orchestrator.local', 'AQAAAAEAACcQAAAAEExamplePasswordHash==', 'Platform Observer', 'VIEWER')
ON CONFLICT (username) DO NOTHING;

-- Sample Workflow 1: Distributed ETL Data Pipeline
INSERT INTO workflow_definitions (name, version, description, dag_definition, is_active, created_by)
VALUES (
    'Data-ETL-Pipeline',
    1,
    'Distributed batch extract, transform, validate, and load pipeline across multiple workers.',
    '{
        "steps": [
            {
                "id": "step-extract-sources",
                "name": "Extract from Data Lake",
                "type": "WORKER_TASK",
                "queue": "data-io",
                "dependsOn": [],
                "maxRetries": 3,
                "timeoutSeconds": 300
            },
            {
                "id": "step-cleanse-data",
                "name": "Data Cleansing & Sanitization",
                "type": "WORKER_TASK",
                "queue": "compute",
                "dependsOn": ["step-extract-sources"],
                "maxRetries": 2,
                "timeoutSeconds": 600
            },
            {
                "id": "step-enrichment",
                "name": "AI/ML Feature Enrichment",
                "type": "WORKER_TASK",
                "queue": "ml-worker",
                "dependsOn": ["step-cleanse-data"],
                "maxRetries": 2,
                "timeoutSeconds": 900
            },
            {
                "id": "step-load-warehouse",
                "name": "Load to Analytics Warehouse",
                "type": "WORKER_TASK",
                "queue": "data-io",
                "dependsOn": ["step-enrichment"],
                "maxRetries": 3,
                "timeoutSeconds": 300
            },
            {
                "id": "step-notify-slack",
                "name": "Dispatch Completion Webhook",
                "type": "HTTP_TASK",
                "queue": "default",
                "dependsOn": ["step-load-warehouse"],
                "maxRetries": 1,
                "timeoutSeconds": 30
            }
        ]
    }'::jsonb,
    TRUE,
    1
) ON CONFLICT (name, version) DO NOTHING;

-- Sample Workflow 2: Distributed Order Fulfillment Saga
INSERT INTO workflow_definitions (name, version, description, dag_definition, is_active, created_by)
VALUES (
    'Order-Fulfillment-Saga',
    1,
    'Distributed e-commerce order saga: payment validation, inventory allocation, shipment dispatch.',
    '{
        "steps": [
            {
                "id": "step-validate-fraud",
                "name": "Fraud & Risk Assessment",
                "type": "HTTP_TASK",
                "queue": "default",
                "dependsOn": [],
                "maxRetries": 2,
                "timeoutSeconds": 15
            },
            {
                "id": "step-charge-card",
                "name": "Charge Customer Card",
                "type": "WORKER_TASK",
                "queue": "payment",
                "dependsOn": ["step-validate-fraud"],
                "maxRetries": 3,
                "timeoutSeconds": 30
            },
            {
                "id": "step-reserve-inventory",
                "name": "Reserve Warehouse Stock",
                "type": "WORKER_TASK",
                "queue": "inventory",
                "dependsOn": ["step-charge-card"],
                "maxRetries": 3,
                "timeoutSeconds": 60
            },
            {
                "id": "step-generate-invoice",
                "name": "Generate PDF Invoice",
                "type": "WORKER_TASK",
                "queue": "documents",
                "dependsOn": ["step-reserve-inventory"],
                "maxRetries": 2,
                "timeoutSeconds": 45
            },
            {
                "id": "step-dispatch-carrier",
                "name": "Notify Shipping Carrier",
                "type": "WORKER_TASK",
                "queue": "logistics",
                "dependsOn": ["step-reserve-inventory"],
                "maxRetries": 3,
                "timeoutSeconds": 60
            }
        ]
    }'::jsonb,
    TRUE,
    1
) ON CONFLICT (name, version) DO NOTHING;

-- Sample Worker Nodes
INSERT INTO worker_nodes (worker_id, hostname, status, supported_queues, current_load, max_concurrency, last_heartbeat_at)
VALUES 
    ('worker-node-compute-01', 'node-01.orchestrator.cluster', 'ONLINE', '{"default", "compute", "data-io"}', 2, 16, CURRENT_TIMESTAMP),
    ('worker-node-compute-02', 'node-02.orchestrator.cluster', 'ONLINE', '{"default", "compute", "ml-worker"}', 1, 16, CURRENT_TIMESTAMP),
    ('worker-node-payments-01', 'node-03.orchestrator.cluster', 'ONLINE', '{"payment", "inventory", "logistics"}', 0, 8, CURRENT_TIMESTAMP)
ON CONFLICT (worker_id) DO NOTHING;
