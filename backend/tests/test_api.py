"""
Backend test suite — pytest + httpx AsyncClient.

Run:
  cd backend
  pip install pytest pytest-asyncio httpx
  pytest tests/ -v
"""
import io
import json
import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.config import get_settings

settings = get_settings()

# ── Fixtures ──────────────────────────────────────────────────────────────────

@pytest.fixture(scope="module")
def client():
    """Synchronous test client for simple request/response tests."""
    with TestClient(app) as c:
        yield c


@pytest.fixture(scope="module")
def auth_headers(client):
    """Obtain a valid JWT and return Authorization headers."""
    resp = client.post("/api/auth/login", json={"username": "admin", "password": "admin123"})
    assert resp.status_code == 200, resp.text
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture()
def mock_vector_store():
    """Mock VectorStoreManager so tests don't need FAISS or OpenAI."""
    mock = MagicMock()
    mock.index_size.return_value = 42
    mock.document_count.return_value = 3
    mock.get_registry.return_value = [
        {
            "doc_id": "test-doc-1",
            "filename": "sample.pdf",
            "page_count": 5,
            "chunk_count": 20,
            "upload_time": "2025-01-01T00:00:00+00:00",
            "size_bytes": 102400,
            "status": "ready",
        }
    ]
    mock.get_doc_meta.return_value = {
        "doc_id": "test-doc-1",
        "filename": "sample.pdf",
        "page_count": 5,
        "chunk_count": 20,
        "upload_time": "2025-01-01T00:00:00+00:00",
        "size_bytes": 102400,
        "status": "ready",
    }
    mock.search.return_value = []
    mock.delete_document.return_value = True
    return mock


# ════════════════════════════════════════════════════════════════════════════
#  Health
# ════════════════════════════════════════════════════════════════════════════

class TestHealth:
    def test_health_returns_200(self, client, mock_vector_store):
        with patch("app.main.get_vector_store", return_value=mock_vector_store):
            resp = client.get("/health")
        assert resp.status_code == 200
        body = resp.json()
        assert body["status"] == "ok"
        assert "version" in body
        assert body["faiss_index_size"] == 42
        assert body["document_count"] == 3

    def test_root_returns_name(self, client):
        resp = client.get("/")
        assert resp.status_code == 200
        assert "RAG" in resp.json()["name"]


# ════════════════════════════════════════════════════════════════════════════
#  Authentication
# ════════════════════════════════════════════════════════════════════════════

class TestAuth:
    def test_login_success_admin(self, client):
        resp = client.post("/api/auth/login", json={"username": "admin", "password": "admin123"})
        assert resp.status_code == 200
        body = resp.json()
        assert "access_token" in body
        assert "refresh_token" in body
        assert body["token_type"] == "bearer"
        assert body["expires_in"] > 0

    def test_login_success_user(self, client):
        resp = client.post("/api/auth/login", json={"username": "user", "password": "user123"})
        assert resp.status_code == 200

    def test_login_wrong_password(self, client):
        resp = client.post("/api/auth/login", json={"username": "admin", "password": "wrongpass"})
        assert resp.status_code == 401
        assert "detail" in resp.json()

    def test_login_unknown_user(self, client):
        resp = client.post("/api/auth/login", json={"username": "ghost", "password": "anything"})
        assert resp.status_code == 401

    def test_login_empty_fields(self, client):
        resp = client.post("/api/auth/login", json={"username": "", "password": ""})
        assert resp.status_code == 422  # validation error

    def test_me_authenticated(self, client, auth_headers):
        resp = client.get("/api/auth/me", headers=auth_headers)
        assert resp.status_code == 200
        body = resp.json()
        assert body["username"] == "admin"
        assert body["role"] == "admin"

    def test_me_unauthenticated(self, client):
        resp = client.get("/api/auth/me")
        assert resp.status_code == 403  # no bearer token at all

    def test_me_invalid_token(self, client):
        resp = client.get("/api/auth/me", headers={"Authorization": "Bearer invalid.token.here"})
        assert resp.status_code == 401

    def test_refresh_token(self, client):
        login = client.post("/api/auth/login", json={"username": "user", "password": "user123"})
        refresh_token = login.json()["refresh_token"]
        resp = client.post("/api/auth/refresh", json={"refresh_token": refresh_token})
        assert resp.status_code == 200
        assert "access_token" in resp.json()

    def test_refresh_invalid_token(self, client):
        resp = client.post("/api/auth/refresh", json={"refresh_token": "bad.token"})
        assert resp.status_code == 401


# ════════════════════════════════════════════════════════════════════════════
#  Documents
# ════════════════════════════════════════════════════════════════════════════

class TestDocuments:
    def test_list_documents_authenticated(self, client, auth_headers, mock_vector_store):
        with patch("app.api.documents.get_vector_store", return_value=mock_vector_store):
            resp = client.get("/api/documents/", headers=auth_headers)
        assert resp.status_code == 200
        body = resp.json()
        assert "documents" in body
        assert "total" in body
        assert body["total"] == 1

    def test_list_documents_unauthenticated(self, client):
        resp = client.get("/api/documents/")
        assert resp.status_code == 403

    def test_upload_non_pdf_rejected(self, client, auth_headers, mock_vector_store):
        with patch("app.api.documents.get_vector_store", return_value=mock_vector_store):
            resp = client.post(
                "/api/documents/upload",
                headers=auth_headers,
                files={"file": ("test.txt", b"hello world", "text/plain")},
            )
        assert resp.status_code == 415

    def test_upload_empty_file_rejected(self, client, auth_headers, mock_vector_store):
        with patch("app.api.documents.get_vector_store", return_value=mock_vector_store):
            resp = client.post(
                "/api/documents/upload",
                headers=auth_headers,
                files={"file": ("empty.pdf", b"", "application/pdf")},
            )
        assert resp.status_code == 400

    def test_upload_valid_pdf(self, client, auth_headers, mock_vector_store):
        """Mock the PDF processor so we don't need a real PDF."""
        from langchain.schema import Document as LCDoc

        fake_doc = LCDoc(
            page_content="Test content",
            metadata={"doc_id": "test-doc-1", "filename": "test.pdf", "page": 1, "total_pages": 1, "chunk_index": 0},
        )
        mock_processor = MagicMock()
        mock_processor.get_page_count.return_value = 1
        mock_processor.process.return_value = [fake_doc]

        # Minimal valid PDF bytes (enough to pass the "not empty" check)
        fake_pdf = b"%PDF-1.4 fake pdf content for testing"

        with patch("app.api.documents.get_vector_store", return_value=mock_vector_store), \
             patch("app.api.documents.pdf_processor", mock_processor):
            resp = client.post(
                "/api/documents/upload",
                headers=auth_headers,
                files={"file": ("test.pdf", fake_pdf, "application/pdf")},
            )
        assert resp.status_code == 200
        body = resp.json()
        assert body["filename"] == "sample.pdf"  # from mock registry
        assert body["status"] == "ready"

    def test_delete_document(self, client, auth_headers, mock_vector_store):
        with patch("app.api.documents.get_vector_store", return_value=mock_vector_store):
            resp = client.delete("/api/documents/test-doc-1", headers=auth_headers)
        assert resp.status_code == 200
        assert resp.json()["doc_id"] == "test-doc-1"

    def test_delete_nonexistent_document(self, client, auth_headers, mock_vector_store):
        mock_vector_store.delete_document.return_value = False
        with patch("app.api.documents.get_vector_store", return_value=mock_vector_store):
            resp = client.delete("/api/documents/does-not-exist", headers=auth_headers)
        assert resp.status_code == 404


# ════════════════════════════════════════════════════════════════════════════
#  Chat
# ════════════════════════════════════════════════════════════════════════════

class TestChat:
    SESSION_ID = str(uuid.uuid4())

    def test_non_streaming_chat(self, client, auth_headers, mock_vector_store):
        mock_chain = MagicMock()
        mock_chain.aget_answer = AsyncMock(return_value=("Test answer", []))

        with patch("app.api.chat.get_vector_store", return_value=mock_vector_store), \
             patch("app.api.chat.RAGChain", return_value=mock_chain):
            resp = client.post(
                "/api/chat/message",
                headers=auth_headers,
                json={"message": "What is this document about?", "session_id": self.SESSION_ID, "stream": False},
            )
        assert resp.status_code == 200
        body = resp.json()
        assert body["answer"] == "Test answer"
        assert "sources" in body
        assert "session_id" in body
        assert "message_id" in body

    def test_chat_empty_message_rejected(self, client, auth_headers):
        resp = client.post(
            "/api/chat/message",
            headers=auth_headers,
            json={"message": "", "session_id": self.SESSION_ID, "stream": False},
        )
        assert resp.status_code == 422

    def test_chat_too_long_message_rejected(self, client, auth_headers):
        resp = client.post(
            "/api/chat/message",
            headers=auth_headers,
            json={"message": "x" * 5000, "session_id": self.SESSION_ID, "stream": False},
        )
        assert resp.status_code == 422

    def test_chat_unauthenticated(self, client):
        resp = client.post(
            "/api/chat/message",
            json={"message": "hello", "session_id": self.SESSION_ID, "stream": False},
        )
        assert resp.status_code == 403

    def test_get_history(self, client, auth_headers):
        resp = client.get(f"/api/chat/history/{self.SESSION_ID}", headers=auth_headers)
        assert resp.status_code == 200
        body = resp.json()
        assert body["session_id"] == self.SESSION_ID
        assert isinstance(body["messages"], list)

    def test_clear_history(self, client, auth_headers):
        resp = client.delete(f"/api/chat/history/{self.SESSION_ID}", headers=auth_headers)
        assert resp.status_code == 200
        assert resp.json()["session_id"] == self.SESSION_ID


# ════════════════════════════════════════════════════════════════════════════
#  Rate Limiter
# ════════════════════════════════════════════════════════════════════════════

class TestRateLimiter:
    def test_rate_limit_headers_present(self, client, auth_headers, mock_vector_store):
        mock_chain = MagicMock()
        mock_chain.aget_answer = AsyncMock(return_value=("answer", []))

        with patch("app.api.chat.get_vector_store", return_value=mock_vector_store), \
             patch("app.api.chat.RAGChain", return_value=mock_chain):
            resp = client.post(
                "/api/chat/message",
                headers=auth_headers,
                json={"message": "test", "session_id": str(uuid.uuid4()), "stream": False},
            )
        assert "x-ratelimit-limit" in resp.headers
        assert "x-ratelimit-remaining" in resp.headers


# ════════════════════════════════════════════════════════════════════════════
#  PDF Processor unit tests
# ════════════════════════════════════════════════════════════════════════════

class TestPDFProcessor:
    def test_clean_text_removes_control_chars(self):
        from app.core.pdf_processor import PDFProcessor
        p = PDFProcessor()
        dirty = "Hello\x00World\n\n\n\nclean"
        clean = p._clean_text(dirty)
        assert "\x00" not in clean
        assert "\n\n\n" not in clean

    def test_clean_text_collapses_spaces(self):
        from app.core.pdf_processor import PDFProcessor
        p = PDFProcessor()
        result = p._clean_text("too   many    spaces")
        assert "  " not in result

    def test_chunk_size_respected(self):
        from app.core.pdf_processor import PDFProcessor
        from app.config import get_settings
        p = PDFProcessor()
        long_text = "word " * 1000   # 5000 chars
        pages = [{"page": 1, "total_pages": 1, "text": long_text}]
        docs = p._chunk_pages(pages, "doc-id", "test.pdf")
        max_size = get_settings().CHUNK_SIZE + get_settings().CHUNK_OVERLAP
        for doc in docs:
            assert len(doc.page_content) <= max_size + 50  # small buffer for splitter

    def test_metadata_attached_to_chunks(self):
        from app.core.pdf_processor import PDFProcessor
        p = PDFProcessor()
        pages = [{"page": 3, "total_pages": 10, "text": "Hello world. " * 50}]
        docs = p._chunk_pages(pages, "my-doc", "file.pdf")
        assert len(docs) > 0
        for doc in docs:
            assert doc.metadata["doc_id"] == "my-doc"
            assert doc.metadata["filename"] == "file.pdf"
            assert doc.metadata["page"] == 3
            assert "chunk_index" in doc.metadata


# ════════════════════════════════════════════════════════════════════════════
#  Conversation Memory unit tests
# ════════════════════════════════════════════════════════════════════════════

class TestConversationMemory:
    def test_add_and_retrieve(self):
        from app.core.rag_chain import ConversationMemory
        mem = ConversationMemory()
        sid = "test-session"
        mem.add(sid, "user", "Hello")
        mem.add(sid, "assistant", "Hi there!")
        history = mem.get_history(sid)
        assert len(history) == 2
        assert history[0].role == "user"
        assert history[1].role == "assistant"

    def test_clear_session(self):
        from app.core.rag_chain import ConversationMemory
        mem = ConversationMemory()
        sid = "clear-test"
        mem.add(sid, "user", "test")
        mem.clear(sid)
        assert mem.get_history(sid) == []

    def test_max_history_trimming(self):
        from app.core.rag_chain import ConversationMemory
        mem = ConversationMemory()
        sid = "trim-test"
        for i in range(ConversationMemory.MAX_HISTORY + 10):
            mem.add(sid, "user", f"message {i}")
        assert len(mem.get_history(sid)) == ConversationMemory.MAX_HISTORY

    def test_independent_sessions(self):
        from app.core.rag_chain import ConversationMemory
        mem = ConversationMemory()
        mem.add("session-a", "user", "hello from A")
        mem.add("session-b", "user", "hello from B")
        assert len(mem.get_history("session-a")) == 1
        assert len(mem.get_history("session-b")) == 1
        assert mem.get_history("session-a")[0].content == "hello from A"
