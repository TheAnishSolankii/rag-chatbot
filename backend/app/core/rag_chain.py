"""
RAG orchestration layer.

Pipeline per query:
  1. Retrieve top-k relevant chunks from FAISS
  2. Format them as context with source citations
  3. Build a prompt that includes conversation history
  4. Stream Gemini completion token-by-token
  5. Return final answer + structured source citations
"""
import logging
import uuid
from collections import defaultdict
from datetime import datetime, timezone
from typing import AsyncIterator, Dict, List, Optional, Tuple

from langchain.schema import Document
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.schema.messages import HumanMessage, AIMessage, SystemMessage

from app.config import get_settings
from app.core.vector_store import VectorStoreManager
from app.models.schemas import ChatMessage, SourceCitation

logger = logging.getLogger(__name__)
settings = get_settings()

# ── System prompt ─────────────────────────────────────────────────────────────

SYSTEM_PROMPT = """You are a knowledgeable AI assistant specialised in answering questions \
about documents uploaded by the user.

Guidelines:
- Base your answers ONLY on the provided context from the documents.
- If the context does not contain enough information, say so clearly — do not hallucinate.
- Always cite specific document sections when making claims.
- Be concise but thorough. Use markdown formatting for clarity (headers, bullet points, code blocks).
- Maintain a helpful, professional tone.

Context from relevant document sections:
{context}
"""


class ConversationMemory:
    """Simple in-memory per-session message history."""

    MAX_HISTORY = 20

    def __init__(self):
        self._sessions: Dict[str, List[ChatMessage]] = defaultdict(list)

    def add(self, session_id: str, role: str, content: str, sources: Optional[List] = None):
        self._sessions[session_id].append(
            ChatMessage(
                role=role,
                content=content,
                timestamp=datetime.now(timezone.utc),
                sources=sources,
            )
        )
        if len(self._sessions[session_id]) > self.MAX_HISTORY:
            self._sessions[session_id] = self._sessions[session_id][-self.MAX_HISTORY:]

    def get_history(self, session_id: str) -> List[ChatMessage]:
        return self._sessions[session_id]

    def clear(self, session_id: str):
        self._sessions.pop(session_id, None)


memory = ConversationMemory()


# ── RAG Chain ─────────────────────────────────────────────────────────────────

class RAGChain:
    def __init__(self, vector_store: VectorStoreManager):
        self.vs = vector_store
        self.llm = ChatGoogleGenerativeAI(
            model=settings.GEMINI_CHAT_MODEL,
            google_api_key=settings.GEMINI_API_KEY,
            temperature=settings.GEMINI_TEMPERATURE,
            max_output_tokens=settings.GEMINI_MAX_TOKENS,
            streaming=True,
        )

    def _retrieve(self, query: str) -> Tuple[str, List[SourceCitation]]:
        results = self.vs.search(query, k=settings.MAX_RETRIEVAL_DOCS)
        if not results:
            return "", []

        context_parts: List[str] = []
        citations: List[SourceCitation] = []
        seen: set = set()

        for rank, (doc, score) in enumerate(results, 1):
            m = doc.metadata
            snippet_key = (m.get("doc_id"), m.get("page"), doc.page_content[:80])
            if snippet_key in seen:
                continue
            seen.add(snippet_key)

            context_parts.append(
                f"[Source {rank}] File: {m.get('filename', 'unknown')} | "
                f"Page {m.get('page', '?')}\n{doc.page_content}"
            )
            citations.append(
                SourceCitation(
                    doc_id=m.get("doc_id", ""),
                    filename=m.get("filename", "unknown"),
                    page=m.get("page", 0),
                    chunk_text=doc.page_content[:400],
                    relevance_score=round(float(1 - score), 4),
                )
            )

        return "\n\n---\n\n".join(context_parts), citations

    def _build_messages(self, query: str, context: str, session_id: str) -> List:
        messages = [SystemMessage(content=SYSTEM_PROMPT.format(context=context))]

        for msg in memory.get_history(session_id):
            if msg.role == "user":
                messages.append(HumanMessage(content=msg.content))
            elif msg.role == "assistant":
                messages.append(AIMessage(content=msg.content))

        messages.append(HumanMessage(content=query))
        return messages

    async def astream_answer(self, query: str, session_id: str) -> AsyncIterator[str]:
        context, citations = self._retrieve(query)
        messages = self._build_messages(query, context, session_id)

        full_answer = []
        async for chunk in self.llm.astream(messages):
            token = chunk.content
            if token:
                full_answer.append(token)
                yield token

        memory.add(session_id, "user", query)
        memory.add(session_id, "assistant", "".join(full_answer), sources=citations)

    async def aget_citations(self, query: str) -> List[SourceCitation]:
        _, citations = self._retrieve(query)
        return citations

    async def aget_answer(self, query: str, session_id: str) -> Tuple[str, List[SourceCitation]]:
        context, citations = self._retrieve(query)
        messages = self._build_messages(query, context, session_id)

        response = await self.llm.ainvoke(messages)
        answer = response.content

        memory.add(session_id, "user", query)
        memory.add(session_id, "assistant", answer, sources=citations)

        return answer, citations
