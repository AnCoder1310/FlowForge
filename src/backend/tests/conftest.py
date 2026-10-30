import pytest
from httpx import ASGITransport, AsyncClient
from app.core.security import TokenService
from app.persistence.store import store, InMemoryStore
from app.main import app

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
