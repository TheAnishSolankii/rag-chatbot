"""
Central configuration management using Pydantic Settings.
All values are loaded from environment variables with sensible defaults.
"""
from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import List, Optional

class Settings(BaseSettings):
    # ── App ──────────────────────────────────────────────────────────────────
    APP_NAME: str = "RAG Chatbot API"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    ENVIRONMENT: str = "production"  # development | production

    # ── Security ─────────────────────────────────────────────────────────────
    SECRET_KEY: str                              # REQUIRED — use a long random string
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # ── Gemini ───────────────────────────────────────────────────────────────
    GEMINI_API_KEY: str                          # REQUIRED
    GEMINI_CHAT_MODEL: str = "gemini-1.5-flash"
    GEMINI_EMBEDDING_MODEL: str = "models/embedding-001"
    GEMINI_MAX_TOKENS: int = 2048
    GEMINI_TEMPERATURE: float = 0.2

    # ── Database ──────────────────────────────────────────────────────────────
    DATABASE_URL: Optional[str] = "sqlite:///./data/ragchatbot.db"

    # ── Vector Store ──────────────────────────────────────────────────────────
    FAISS_INDEX_PATH: str = "./data/faiss_index"
    FAISS_DIMENSION: int = 768  # Gemini embedding-001 output size

    # ── Document Processing ───────────────────────────────────────────────────
    UPLOAD_DIR: str = "./data/uploads"
    MAX_UPLOAD_SIZE_MB: int = 50
    CHUNK_SIZE: int = 1000
    CHUNK_OVERLAP: int = 200
    MAX_RETRIEVAL_DOCS: int = 5

    # ── Rate Limiting ─────────────────────────────────────────────────────────
    RATE_LIMIT_PER_MINUTE: int = 30
    RATE_LIMIT_BURST: int = 10

    # ── CORS ──────────────────────────────────────────────────────────────────
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://frontend:3000",
    ]

    # ── Users ─────────────────────────────────────────────────────────────────
    DEMO_USERS: str = "admin:admin123,user:user123"

    class Config:
        env_file = ".env"
        case_sensitive = True

@lru_cache()
def get_settings() -> Settings:
    """Return cached settings instance — call this everywhere."""
    return Settings()
