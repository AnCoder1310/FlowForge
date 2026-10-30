import json
import os
import sqlite3
import sys

DB_PATH = os.path.join(os.path.dirname(__file__), "workflow_orchestrator.db")

def init_sqlite_db():
    print(f"Initializing database at: {DB_PATH}")
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Enable foreign keys
    cursor.execute("PRAGMA foreign_keys = ON;")

    # 1. Users Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS app_users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        full_name TEXT NOT NULL,
        phone TEXT,
        avatar_url TEXT,
        role TEXT NOT NULL DEFAULT 'VIEWER',
        timezone TEXT NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',
        is_active BOOLEAN NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        last_login_at TEXT,
        deleted_at TEXT
    );
    """)

    # 2. Workflow Definitions Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS workflow_definitions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        version INTEGER NOT NULL DEFAULT 1,
        description TEXT,
        dag_definition TEXT NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT 1,
        created_by INTEGER REFERENCES app_users(id),
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        deleted_at TEXT,
        UNIQUE (name, version)
    );
    """)

    # 3. Worker Nodes Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS worker_nodes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        worker_id TEXT NOT NULL UNIQUE,
        hostname TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'ONLINE',
        supported_queues TEXT NOT NULL DEFAULT '["default"]',
        current_load INTEGER NOT NULL DEFAULT 0,
        max_concurrency INTEGER NOT NULL DEFAULT 10,
        last_heartbeat_at TEXT NOT NULL DEFAULT (datetime('now')),
        registered_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    """)

    # 4. Workflow Instances Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS workflow_instances (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        workflow_id INTEGER NOT NULL REFERENCES workflow_definitions(id),
        workflow_name TEXT NOT NULL,
        version INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'PENDING',
        input_payload TEXT NOT NULL DEFAULT '{}',
        output_payload TEXT,
        context_data TEXT NOT NULL DEFAULT '{}',
        error_message TEXT,
        triggered_by INTEGER REFERENCES app_users(id),
        started_at TEXT,
        completed_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    """)

    # 5. Task Executions Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS task_executions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        instance_id INTEGER NOT NULL REFERENCES workflow_instances(id) ON DELETE CASCADE,
        step_id TEXT NOT NULL,
        step_name TEXT NOT NULL,
        task_type TEXT NOT NULL DEFAULT 'WORKER_TASK',
        queue_name TEXT NOT NULL DEFAULT 'default',
        status TEXT NOT NULL DEFAULT 'PENDING',
        retry_count INTEGER NOT NULL DEFAULT 0,
        max_retries INTEGER NOT NULL DEFAULT 3,
        timeout_seconds INTEGER NOT NULL DEFAULT 300,
        input_payload TEXT NOT NULL DEFAULT '{}',
        output_payload TEXT,
        error_message TEXT,
        assigned_worker_id TEXT,
        scheduled_at TEXT,
        claimed_at TEXT,
        started_at TEXT,
        completed_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE (instance_id, step_id)
    );
    """)

    # 6. Audit Logs Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        actor_user_id INTEGER REFERENCES app_users(id),
        action TEXT NOT NULL,
        module TEXT NOT NULL,
        detail TEXT NOT NULL,
        metadata TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    """)

    # Create Indexes
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_workflow_instances_status ON workflow_instances(status, created_at DESC);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_task_executions_queue_status ON task_executions(queue_name, status, scheduled_at);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_task_executions_instance ON task_executions(instance_id);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_worker_nodes_heartbeat ON worker_nodes(status, last_heartbeat_at);")

    # Add sys.path so we can import PasswordService
    sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))
    from app.core.security import PasswordService

    default_hash = PasswordService.hash_password("ChangeMe123!")

    # Seed Default Users
    users_data = [
        ("admin", "admin@orchestrator.local", default_hash, "Platform Administrator", "ADMIN"),
        ("operator", "operator@orchestrator.local", default_hash, "Operations Lead", "OPERATOR"),
        ("dev", "dev@orchestrator.local", default_hash, "Workflow Developer", "DEVELOPER"),
        ("viewer", "viewer@orchestrator.local", default_hash, "Platform Observer", "VIEWER")
    ]
    for u in users_data:
        cursor.execute("""
        INSERT OR IGNORE INTO app_users (username, email, password_hash, full_name, role)
        VALUES (?, ?, ?, ?, ?)
        """, u)

    # Seed Sample Workflow 1: Data-ETL-Pipeline
    etl_dag = {
        "steps": [
            {"id": "step-extract", "name": "Extract from Data Lake", "type": "WORKER_TASK", "queue": "data-io", "dependsOn": [], "maxRetries": 3, "timeoutSeconds": 300},
            {"id": "step-transform", "name": "Transform & Cleanse", "type": "WORKER_TASK", "queue": "compute", "dependsOn": ["step-extract"], "maxRetries": 2, "timeoutSeconds": 600},
            {"id": "step-enrich", "name": "ML Feature Enrichment", "type": "WORKER_TASK", "queue": "ml-worker", "dependsOn": ["step-transform"], "maxRetries": 2, "timeoutSeconds": 900},
            {"id": "step-load", "name": "Load to Warehouse", "type": "WORKER_TASK", "queue": "data-io", "dependsOn": ["step-enrich"], "maxRetries": 3, "timeoutSeconds": 300},
            {"id": "step-notify", "name": "Send Webhook Alert", "type": "HTTP_TASK", "queue": "default", "dependsOn": ["step-load"], "maxRetries": 1, "timeoutSeconds": 30}
        ]
    }
    cursor.execute("""
    INSERT OR IGNORE INTO workflow_definitions (name, version, description, dag_definition, is_active, created_by)
    VALUES (?, ?, ?, ?, ?, ?)
    """, ("Data-ETL-Pipeline", 1, "Distributed batch extract, transform, validate, and load pipeline across multiple workers.", json.dumps(etl_dag), 1, 1))

    # Seed Sample Workflow 2: Order-Fulfillment-Saga
    saga_dag = {
        "steps": [
            {"id": "step-validate-fraud", "name": "Fraud & Risk Assessment", "type": "HTTP_TASK", "queue": "default", "dependsOn": [], "maxRetries": 2, "timeoutSeconds": 15},
            {"id": "step-charge-card", "name": "Charge Customer Card", "type": "WORKER_TASK", "queue": "payment", "dependsOn": ["step-validate-fraud"], "maxRetries": 3, "timeoutSeconds": 30},
            {"id": "step-reserve-stock", "name": "Reserve Warehouse Stock", "type": "WORKER_TASK", "queue": "inventory", "dependsOn": ["step-charge-card"], "maxRetries": 3, "timeoutSeconds": 60},
            {"id": "step-create-invoice", "name": "Generate PDF Invoice", "type": "WORKER_TASK", "queue": "documents", "dependsOn": ["step-reserve-stock"], "maxRetries": 2, "timeoutSeconds": 45},
            {"id": "step-dispatch", "name": "Notify Shipping Carrier", "type": "WORKER_TASK", "queue": "logistics", "dependsOn": ["step-reserve-stock"], "maxRetries": 3, "timeoutSeconds": 60}
        ]
    }
    cursor.execute("""
    INSERT OR IGNORE INTO workflow_definitions (name, version, description, dag_definition, is_active, created_by)
    VALUES (?, ?, ?, ?, ?, ?)
    """, ("Order-Fulfillment-Saga", 1, "Distributed e-commerce order saga: payment validation, inventory allocation, shipment dispatch.", json.dumps(saga_dag), 1, 1))

    # Seed Sample Workflow 3: AI-Customer-Feedback-Analyzer (v2 Production-Ready)
    feedback_dag = {
        "steps": [
            {
                "id": "step-fetch-reviews",
                "name": "Fetch Customer Reviews",
                "type": "HTTP_TASK",
                "queue": "default",
                "dependsOn": [],
                "maxRetries": 3,
                "timeoutSeconds": 30,
                "configurationJson": json.dumps({"endpoint": "https://api.reviews.internal/v1/feed", "method": "GET"}),
                "condition": None
            },
            {
                "id": "step-ai-sentiment",
                "name": "AI Sentiment & Topic Classification",
                "type": "AI_AGENT_TASK",
                "queue": "ai-agent",
                "dependsOn": ["step-fetch-reviews"],
                "maxRetries": 2,
                "timeoutSeconds": 60,
                "configurationJson": json.dumps({"model": "9Router-Sentiment-v1", "temperature": 0.2}),
                "condition": None
            },
            {
                "id": "step-ai-summary",
                "name": "AI Executive Summary Generation",
                "type": "AI_AGENT_TASK",
                "queue": "ai-agent",
                "dependsOn": ["step-ai-sentiment"],
                "maxRetries": 2,
                "timeoutSeconds": 90,
                "configurationJson": json.dumps({"model": "9Router-Executive-Summarizer", "targetAudience": "C-Level"}),
                "condition": None
            },
            {
                "id": "step-detect-urgent",
                "name": "Detect Urgent Reviews",
                "type": "AI_AGENT_TASK",
                "queue": "ai-agent",
                "dependsOn": ["step-ai-sentiment"],
                "maxRetries": 2,
                "timeoutSeconds": 45,
                "configurationJson": json.dumps({"thresholdSeverity": "CRITICAL"}),
                "condition": None
            },
            {
                "id": "step-alert-escalate",
                "name": "Escalate Urgent Issues to Slack",
                "type": "HTTP_TASK",
                "queue": "default",
                "dependsOn": ["step-detect-urgent"],
                "maxRetries": 3,
                "timeoutSeconds": 30,
                "configurationJson": json.dumps({"channel": "#customer-escalations", "idempotencyHeader": "X-Idempotency-Key"}),
                "condition": "hasUrgentReviews == true"
            },
            {
                "id": "step-persist-insights",
                "name": "Store Analytics Insights",
                "type": "WORKER_TASK",
                "queue": "data-io",
                "dependsOn": ["step-ai-summary", "step-alert-escalate"],
                "maxRetries": 3,
                "timeoutSeconds": 120,
                "configurationJson": json.dumps({"table": "analytics_customer_insights", "upsertKey": "batchId"}),
                "condition": None
            },
            {
                "id": "step-notify-report-ready",
                "name": "Notify Analytics Report Ready",
                "type": "NOTIFICATION",
                "queue": "notification",
                "dependsOn": ["step-persist-insights"],
                "maxRetries": 2,
                "timeoutSeconds": 30,
                "configurationJson": json.dumps({"channels": ["email", "inapp"], "template": "analytics-ready-v1"}),
                "condition": None
            }
        ]
    }
    cursor.execute("""
    INSERT OR IGNORE INTO workflow_definitions (name, version, description, dag_definition, is_active, created_by)
    VALUES (?, ?, ?, ?, ?, ?)
    """, ("AI-Customer-Feedback-Analyzer", 2, "Production-grade Agentic DAG for Customer Feedback: parallel AI summarization & urgent issue detection, conditional Slack escalation with idempotency, converged insights storage, and notification dispatch.", json.dumps(feedback_dag), 1, 1))

    # Seed Sample Workers
    workers_data = [
        ("worker-default-01", "node-01.orchestrator.cluster", "ONLINE", json.dumps(["default", "notification"]), 0, 4),
        ("worker-compute-01", "node-02.orchestrator.cluster", "ONLINE", json.dumps(["compute"]), 0, 4),
        ("worker-ai-01", "node-03.orchestrator.cluster", "ONLINE", json.dumps(["ai-agent"]), 0, 2),
        ("worker-data-01", "node-04.orchestrator.cluster", "ONLINE", json.dumps(["data-io"]), 0, 4),
        ("worker-payment-01", "node-05.orchestrator.cluster", "ONLINE", json.dumps(["payment", "inventory", "logistics", "documents"]), 0, 2),
    ]
    for w in workers_data:
        cursor.execute("""
        INSERT OR IGNORE INTO worker_nodes (worker_id, hostname, status, supported_queues, current_load, max_concurrency)
        VALUES (?, ?, ?, ?, ?, ?)
        """, w)

    # Seed a sample execution run
    cursor.execute("""
    INSERT INTO workflow_instances (workflow_id, workflow_name, version, status, input_payload, started_at, triggered_by)
    VALUES (1, 'Data-ETL-Pipeline', 1, 'RUNNING', '{"batchId":"batch-20261029-01"}', datetime('now'), 1)
    """)
    instance_id = cursor.lastrowid

    cursor.execute("""
    INSERT INTO task_executions (instance_id, step_id, step_name, task_type, queue_name, status, scheduled_at, started_at, assigned_worker_id)
    VALUES (?, 'step-extract', 'Extract from Data Lake', 'WORKER_TASK', 'data-io', 'RUNNING', datetime('now'), datetime('now'), 'worker-node-compute-01')
    """, (instance_id,))

    cursor.execute("""
    INSERT INTO audit_logs (actor_user_id, action, module, detail)
    VALUES (1, 'TRIGGER', 'WORKFLOW', 'Triggered execution #1 for Data-ETL-Pipeline')
    """)

    conn.commit()
    conn.close()
    print("Database initialization completed successfully!")

if __name__ == "__main__":
    init_sqlite_db()
