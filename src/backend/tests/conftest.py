import os
import shutil
import tempfile
import pytest
from httpx import ASGITransport, AsyncClient

# Setup isolated test database before importing app/store
_original_db = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "database", "workflow_orchestrator.db"))
_tmp_file = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
_test_db_path = _tmp_file.name
_tmp_file.close()

if os.path.exists(_original_db):
    shutil.copyfile(_original_db, _test_db_path)
os.environ["SQLITE_DB_PATH"] = _test_db_path

from app.core.security import TokenService
from app.persistence.store import store, InMemoryStore
from app.main import app


def pytest_sessionfinish(session, exitstatus):
    if os.path.exists(_test_db_path):
        try:
            os.remove(_test_db_path)
        except Exception:
            pass


@pytest.fixture
def anyio_backend():
    return "asyncio"


@pytest.fixture
async def client():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac


@pytest.fixture
def admin_headers():
    token = TokenService.issue(1, "ADMIN")
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def operator_headers():
    token = TokenService.issue(2, "OPERATOR")
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def viewer_headers():
    token = TokenService.issue(4, "VIEWER")
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(autouse=True)
def clean_tasks_for_test():
    store.tasks.clear()
    store.instances.clear()
    yield
