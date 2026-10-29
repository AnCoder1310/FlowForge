-- ============================================================
-- PostgreSQL schema — workflow_orchestrator
-- Distributed Workflow Orchestration Platform
-- PostgreSQL 15+
-- ============================================================

BEGIN;

CREATE SCHEMA IF NOT EXISTS workflow_orchestrator;
SET search_path TO workflow_orchestrator, public;

-- ============================================================
-- 1. ENUMS
-- ============================================================
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('ADMIN', 'OPERATOR', 'DEVELOPER', 'VIEWER');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE workflow_status AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED', 'PAUSED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE step_status AS ENUM ('PENDING', 'SCHEDULED', 'RUNNING', 'COMPLETED', 'FAILED', 'SKIPPED', 'TIMED_OUT');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE task_type AS ENUM ('WORKER_TASK', 'HTTP_TASK', 'SYSTEM_TASK', 'DECISION', 'DELAY');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE worker_status AS ENUM ('ONLINE', 'BUSY', 'OFFLINE', 'DRAINING');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE audit_action AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'TRIGGER', 'CANCEL', 'FAIL', 'COMPLETE');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ============================================================
-- 2. USERS
-- ============================================================
CREATE TABLE IF NOT EXISTS app_users (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    username        VARCHAR(100) NOT NULL UNIQUE,
    email           VARCHAR(255) NOT NULL UNIQUE,
    password_hash   TEXT NOT NULL,
    full_name       VARCHAR(255) NOT NULL,
    phone           VARCHAR(30),
    avatar_url      TEXT,
    role            user_role NOT NULL DEFAULT 'VIEWER',
    timezone        VARCHAR(64) NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_login_at   TIMESTAMPTZ,
    deleted_at      TIMESTAMPTZ
);

-- ============================================================
-- 3. WORKFLOW DEFINITIONS (DAG Blueprints)
-- ============================================================
CREATE TABLE IF NOT EXISTS workflow_definitions (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name            VARCHAR(150) NOT NULL,
    version         INT NOT NULL DEFAULT 1,
    description     TEXT,
    dag_definition  JSONB NOT NULL, -- Steps, dependencies, retry policies
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_by      BIGINT REFERENCES app_users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at      TIMESTAMPTZ,
    CONSTRAINT uq_workflow_name_version UNIQUE (name, version)
);

-- ============================================================
-- 4. WORKER NODES (Distributed Workers)
-- ============================================================
CREATE TABLE IF NOT EXISTS worker_nodes (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    worker_id           VARCHAR(100) NOT NULL UNIQUE,
    hostname            VARCHAR(255) NOT NULL,
    status              worker_status NOT NULL DEFAULT 'ONLINE',
    supported_queues    TEXT[] NOT NULL DEFAULT '{"default"}',
    current_load        INT NOT NULL DEFAULT 0,
    max_concurrency     INT NOT NULL DEFAULT 10,
    last_heartbeat_at   TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    registered_at       TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 5. WORKFLOW INSTANCES (Execution Runs)
-- ============================================================
CREATE TABLE IF NOT EXISTS workflow_instances (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    workflow_id     BIGINT NOT NULL REFERENCES workflow_definitions(id) ON DELETE RESTRICT,
    workflow_name   VARCHAR(150) NOT NULL,
    version         INT NOT NULL,
    status          workflow_status NOT NULL DEFAULT 'PENDING',
    input_payload   JSONB NOT NULL DEFAULT '{}'::jsonb,
    output_payload  JSONB,
    context_data    JSONB NOT NULL DEFAULT '{}'::jsonb,
    error_message   TEXT,
    triggered_by    BIGINT REFERENCES app_users(id),
    started_at      TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 6. TASK EXECUTIONS (Step Executions in a Workflow Run)
-- ============================================================
CREATE TABLE IF NOT EXISTS task_executions (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    instance_id         BIGINT NOT NULL REFERENCES workflow_instances(id) ON DELETE CASCADE,
    step_id             VARCHAR(100) NOT NULL,
    step_name           VARCHAR(255) NOT NULL,
    task_type           task_type NOT NULL DEFAULT 'WORKER_TASK',
    queue_name          VARCHAR(100) NOT NULL DEFAULT 'default',
    status              step_status NOT NULL DEFAULT 'PENDING',
    retry_count         INT NOT NULL DEFAULT 0,
    max_retries         INT NOT NULL DEFAULT 3,
    input_payload       JSONB NOT NULL DEFAULT '{}'::jsonb,
    output_payload      JSONB,
    error_message       TEXT,
    assigned_worker_id  VARCHAR(100),
    scheduled_at        TIMESTAMPTZ,
    started_at          TIMESTAMPTZ,
    completed_at        TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_instance_step UNIQUE (instance_id, step_id)
);

-- ============================================================
-- 7. AUDIT LOGS & EXECUTION EVENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    actor_user_id   BIGINT REFERENCES app_users(id),
    action          audit_action NOT NULL,
    module          VARCHAR(100) NOT NULL,
    detail          TEXT NOT NULL,
    metadata        JSONB,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for high-throughput orchestration
CREATE INDEX IF NOT EXISTS idx_workflow_instances_status ON workflow_instances(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_task_executions_queue_status ON task_executions(queue_name, status, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_task_executions_instance ON task_executions(instance_id);
CREATE INDEX IF NOT EXISTS idx_worker_nodes_heartbeat ON worker_nodes(status, last_heartbeat_at);

COMMIT;
