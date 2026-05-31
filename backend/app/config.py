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

    # ── OpenAI ───────────────────────────────────────────────────────────────
    OPENAI_API_KEY: str                          # REQUIRED
    OPENAI_CHAT_MODEL: str = "gpt-4.1"
    OPENAI_EMBEDDING_MODEL: str = "text-embedding-3-small"
    OPENAI_MAX_TOKENS: int = 2048
    OPENAI_TEMPERATURE: float = 0.2

    # ── Database ──────────────────────────────────────────────────────────────
    DATABASE_URL: Optional[str] = "sqlite:///./data/ragchatbot.db"

    # ── Vector Store ──────────────────────────────────────────────────────────
    FAISS_INDEX_PATH: str = "./data/faiss_index"
    FAISS_DIMENSION: int = 1536  # text-embedding-3-small output size

    # ── Document Processing ───────────────────────────────────────────────────
    UPLOAD_DIR: str = "./data/uploads"
    MAX_UPLOAD_SIZE_MB: int = 50
    CHUNK_SIZE: int = 1000          # characters per chunk
    CHUNK_OVERLAP: int = 200        # overlap between consecutive chunks
    MAX_RETRIEVAL_DOCS: int = 5     # top-k docs to retrieve per query

    # ── Rate Limiting ─────────────────────────────────────────────────────────
    RATE_LIMIT_PER_MINUTE: int = 30
    RATE_LIMIT_BURST: int = 10

    # ── CORS ──────────────────────────────────────────────────────────────────
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://frontend:3000",
    ]

    # ── Users (simple in-memory auth — swap with DB in production) ────────────
    # Format: "username:hashed_password,username2:hashed_password2"
    DEMO_USERS: str = "admin:admin123,user:user123"

    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    """Return cached settings instance — call this everywhere."""
    return Settings()
