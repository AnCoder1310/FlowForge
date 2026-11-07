import json
import os
import sqlite3
from typing import Any, Dict, List, Optional
from datetime import datetime, timezone

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", ".."))
DB_FILE = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "database", "workflow_orchestrator.db"))

def get_db_path() -> str:
    path = os.environ.get("SQLITE_DB_PATH")
    if path:
        if os.path.isabs(path):
            return path
        # 1. If relative path exists in current working directory, use it
        if os.path.exists(path):
            return os.path.abspath(path)
        # 2. Check relative to project root
        root_candidate = os.path.join(PROJECT_ROOT, path)
        if os.path.exists(root_candidate) or os.path.exists(os.path.dirname(root_candidate)):
            return root_candidate
        # 3. Fallback to default DB_FILE if it exists
        if os.path.exists(DB_FILE):
            return DB_FILE
        return os.path.abspath(path)
    return DB_FILE

def get_db_connection():
    conn = sqlite3.connect(get_db_path(), timeout=30)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    conn.execute("PRAGMA busy_timeout = 30000")
    return conn

def sync_db_status():
    db_path = get_db_path()
    if not os.path.exists(db_path):
        return {"connected": False, "type": "sqlite", "path": db_path}
    try:
        conn = get_db_connection()
        count = conn.execute("SELECT count(*) FROM workflow_definitions").fetchone()[0]
        conn.close()
        return {"connected": True, "type": "sqlite", "path": db_path, "workflowsCount": count}
    except Exception as ex:
        return {"connected": False, "error": str(ex)}
