import json
import os
import sqlite3
from typing import Any, Dict, List, Optional
from datetime import datetime, timezone

DB_FILE = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "database", "workflow_orchestrator.db"))

def get_db_connection():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn

def sync_db_status():
    if not os.path.exists(DB_FILE):
        return {"connected": False, "type": "sqlite", "path": DB_FILE}
    try:
        conn = get_db_connection()
        count = conn.execute("SELECT count(*) FROM workflow_definitions").fetchone()[0]
        conn.close()
        return {"connected": True, "type": "sqlite", "path": DB_FILE, "workflowsCount": count}
    except Exception as ex:
        return {"connected": False, "error": str(ex)}
