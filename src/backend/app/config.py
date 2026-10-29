import os
from dotenv import load_dotenv
from pydantic import BaseModel

# Load .env file from root directory or src/backend
load_dotenv(os.path.join(os.path.dirname(__file__), "..", "..", "..", ".env"))
load_dotenv()

class Settings(BaseModel):
    PROJECT_NAME: str = "Distributed Workflow Orchestration Platform"
    VERSION: str = "1.0.0"
    API_V1_PREFIX: str = "/api/v1"
    
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8000"))
    
    SIGNING_KEY: str = os.getenv(
        "AUTHENTICATION__SIGNINGKEY",
        "development-only-workflow-orchestrator-signing-key-123456"
    )
    TOKEN_EXPIRE_MINUTES: int = int(os.getenv("TOKEN_EXPIRE_MINUTES", str(60 * 24)))
    
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "postgresql://postgres:postgres@localhost:55432/workflow_orchestrator"
    )
    
    SQLITE_DB_PATH: str = os.getenv(
        "SQLITE_DB_PATH",
        "src/database/workflow_orchestrator.db"
    )
    
    CORS_ORIGINS: list[str] = [
        origin.strip()
        for origin in os.getenv(
            "CORS_ORIGINS",
            "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000"
        ).split(",")
        if origin.strip()
    ]

settings = Settings()
