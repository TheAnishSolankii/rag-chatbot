"""
Shared pytest configuration.
Sets environment variables before any import so Settings() is satisfied.
"""
import os
import pytest

# ── Set required env vars before app imports ──────────────────────────────────
os.environ.setdefault("SECRET_KEY", "test-secret-key-not-for-production-32chars!!")
os.environ.setdefault("OPENAI_API_KEY", "sk-test-fake-key-for-unit-tests")
os.environ.setdefault("DATABASE_URL", "sqlite:///./data/test_ragchatbot.db")
os.environ.setdefault("FAISS_INDEX_PATH", "./data/test_faiss_index")
os.environ.setdefault("UPLOAD_DIR", "./data/test_uploads")
os.environ.setdefault("DEBUG", "true")
