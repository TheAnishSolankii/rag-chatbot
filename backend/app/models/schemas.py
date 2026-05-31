"""
Pydantic v2 schemas — single source of truth for all request/response shapes.
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


# ── Auth ─────────────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    username: str = Field(..., min_length=1, max_length=64)
    password: str = Field(..., min_length=1, max_length=128)


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int  # seconds


class RefreshRequest(BaseModel):
    refresh_token: str


class UserInfo(BaseModel):
    username: str
    role: str = "user"


# ── Documents ────────────────────────────────────────────────────────────────

class DocumentMeta(BaseModel):
    doc_id: str
    filename: str
    page_count: int
    chunk_count: int
    upload_time: datetime
    size_bytes: int
    status: str  # processing | ready | error


class DocumentListResponse(BaseModel):
    documents: List[DocumentMeta]
    total: int


class DeleteDocumentResponse(BaseModel):
    message: str
    doc_id: str


# ── Chat ─────────────────────────────────────────────────────────────────────

class SourceCitation(BaseModel):
    doc_id: str
    filename: str
    page: int
    chunk_text: str        # snippet shown in UI
    relevance_score: float


class ChatMessage(BaseModel):
    role: str              # "user" | "assistant"
    content: str
    timestamp: Optional[datetime] = None
    sources: Optional[List[SourceCitation]] = None


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=4096)
    session_id: str = Field(..., description="Client-generated session UUID")
    stream: bool = True


class ChatResponse(BaseModel):
    answer: str
    sources: List[SourceCitation]
    session_id: str
    message_id: str


class SessionHistoryResponse(BaseModel):
    session_id: str
    messages: List[ChatMessage]


# ── Health ───────────────────────────────────────────────────────────────────

class HealthResponse(BaseModel):
    status: str
    version: str
    faiss_index_size: int
    document_count: int
