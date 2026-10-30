import json
import os
import sqlite3
from typing import Any, Dict, List, Optional
from datetime import datetime, timezone

DB_FILE = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "database", "workflow_orchestrator.db"))

def get_db_path() -> str:
    path = os.environ.get("SQLITE_DB_PATH")
    if path:
        return os.path.abspath(path)
    return DB_FILE

def get_db_connection():
    conn = sqlite3.connect(get_db_path())
    conn.row_factory = sqlite3.Row
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
