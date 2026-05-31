"""
Chat routes — /api/chat/*

  POST /stream   → Server-Sent Events streaming response (primary)
  POST /message  → Standard JSON response (fallback / testing)
  GET  /history/{session_id} → Conversation history
  DELETE /history/{session_id} → Clear conversation
"""
import json
import logging
import uuid
from typing import AsyncIterator

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import StreamingResponse
from sse_starlette.sse import EventSourceResponse

from app.auth.jwt_handler import get_current_user
from app.core.rag_chain import RAGChain, memory
from app.core.vector_store import VectorStoreManager, get_vector_store
from app.models.schemas import (
    ChatRequest,
    ChatResponse,
    SessionHistoryResponse,
    SourceCitation,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/chat", tags=["Chat"])


def _get_rag_chain(vs: VectorStoreManager = Depends(get_vector_store)) -> RAGChain:
    return RAGChain(vs)


# ── Streaming endpoint ────────────────────────────────────────────────────────

@router.post("/stream", summary="Streaming chat via Server-Sent Events")
async def stream_chat(
    payload: ChatRequest,
    request: Request,
    _user: dict = Depends(get_current_user),
    chain: RAGChain = Depends(_get_rag_chain),
):
    """
    Returns a Server-Sent Events stream.
    Event types emitted:
      - data: { type: "token", content: "..." }   — LLM token
      - data: { type: "sources", sources: [...] } — citations after streaming
      - data: { type: "done", message_id: "..." }  — stream complete
      - data: { type: "error", detail: "..." }     — error occurred
    """
    message_id = str(uuid.uuid4())
    citations = await chain.aget_citations(payload.message)

    async def event_generator() -> AsyncIterator[dict]:
        try:
            async for token in chain.astream_answer(payload.message, payload.session_id):
                if await request.is_disconnected():
                    break
                yield {
                    "data": json.dumps({"type": "token", "content": token}),
                }

            # After streaming: send citations
            yield {
                "data": json.dumps({
                    "type": "sources",
                    "sources": [c.model_dump() for c in citations],
                }),
            }

            yield {
                "data": json.dumps({"type": "done", "message_id": message_id}),
            }

        except Exception as exc:
            logger.exception("Streaming error for session %s: %s", payload.session_id, exc)
            yield {
                "data": json.dumps({"type": "error", "detail": str(exc)}),
            }

    return EventSourceResponse(event_generator())


# ── Non-streaming endpoint ────────────────────────────────────────────────────

@router.post(
    "/message",
    response_model=ChatResponse,
    summary="Non-streaming chat (returns full response)",
)
async def chat_message(
    payload: ChatRequest,
    _user: dict = Depends(get_current_user),
    chain: RAGChain = Depends(_get_rag_chain),
):
    try:
        answer, citations = await chain.aget_answer(payload.message, payload.session_id)
    except Exception as exc:
        logger.exception("Chat error: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate response.",
        )

    return ChatResponse(
        answer=answer,
        sources=citations,
        session_id=payload.session_id,
        message_id=str(uuid.uuid4()),
    )


# ── History endpoints ─────────────────────────────────────────────────────────

@router.get(
    "/history/{session_id}",
    response_model=SessionHistoryResponse,
    summary="Get conversation history",
)
async def get_history(
    session_id: str,
    _user: dict = Depends(get_current_user),
):
    messages = memory.get_history(session_id)
    return SessionHistoryResponse(session_id=session_id, messages=messages)


@router.delete("/history/{session_id}", summary="Clear conversation history")
async def clear_history(
    session_id: str,
    _user: dict = Depends(get_current_user),
):
    memory.clear(session_id)
    return {"message": "Conversation history cleared.", "session_id": session_id}
