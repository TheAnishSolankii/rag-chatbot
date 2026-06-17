"""
FAISS vector store wrapper.

Responsibilities:
  - Persist the FAISS index and its docstore to disk (thread-safe writes)
  - Add / delete document chunks
  - Similarity search with score and metadata
  - In-memory document registry for fast O(1) lookups by doc_id
"""
import json
import logging
import threading
import uuid
from pathlib import Path
from typing import List, Dict, Optional, Tuple
from datetime import datetime, timezone

from langchain.schema import Document
from langchain_community.vectorstores import FAISS
from langchain_google_genai import GoogleGenerativeAIEmbeddings

from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


class VectorStoreManager:
    """Singleton-style manager — instantiate once at startup."""

    def __init__(self):
        self._lock = threading.Lock()
       self._embeddings = GoogleGenerativeAIEmbeddings(
    model="models/text-embedding-004",
    google_api_key=settings.GEMINI_API_KEY,
    task_type="retrieval_document",
)
        self._index_path = Path(settings.FAISS_INDEX_PATH)
        self._index_path.mkdir(parents=True, exist_ok=True)

        self._registry: Dict[str, dict] = {}
        self._registry_path = self._index_path / "registry.json"

        self._store: Optional[FAISS] = None
        self._load()

    # ── Public API ─────────────────────────────────────────────────────────────

    def add_documents(
        self,
        documents: List[Document],
        doc_id: str,
        filename: str,
        page_count: int,
        size_bytes: int,
    ) -> None:
        if not documents:
            logger.warning("add_documents called with empty list for doc_id=%s", doc_id)
            return

        with self._lock:
            if self._store is None:
                self._store = FAISS.from_documents(documents, self._embeddings)
            else:
                self._store.add_documents(documents)

            self._registry[doc_id] = {
                "doc_id": doc_id,
                "filename": filename,
                "page_count": page_count,
                "chunk_count": len(documents),
                "upload_time": datetime.now(timezone.utc).isoformat(),
                "size_bytes": size_bytes,
                "status": "ready",
            }
            self._persist()

        logger.info("Indexed %d chunks for doc_id=%s", len(documents), doc_id)

    def search(
        self, query: str, k: int = 5, doc_ids: Optional[List[str]] = None
    ) -> List[Tuple[Document, float]]:
        if self._store is None:
            return []

        fetch_k = k * 4 if doc_ids else k
        results = self._store.similarity_search_with_score(query, k=fetch_k)

        if doc_ids:
            doc_id_set = set(doc_ids)
            results = [
                (doc, score)
                for doc, score in results
                if doc.metadata.get("doc_id") in doc_id_set
            ]

        return results[:k]

    def delete_document(self, doc_id: str) -> bool:
        with self._lock:
            if doc_id not in self._registry:
                return False

            if self._store is not None:
                all_docs = list(self._store.docstore._dict.values())
                keep_docs = [
                    d for d in all_docs if d.metadata.get("doc_id") != doc_id
                ]

                if keep_docs:
                    self._store = FAISS.from_documents(keep_docs, self._embeddings)
                else:
                    self._store = None

            del self._registry[doc_id]
            self._persist()

        logger.info("Deleted doc_id=%s from index", doc_id)
        return True

    def get_registry(self) -> List[dict]:
        return list(self._registry.values())

    def get_doc_meta(self, doc_id: str) -> Optional[dict]:
        return self._registry.get(doc_id)

    def index_size(self) -> int:
        if self._store is None:
            return 0
        return self._store.index.ntotal

    def document_count(self) -> int:
        return len(self._registry)

    # ── Persistence ────────────────────────────────────────────────────────────

    def _persist(self) -> None:
        if self._store is not None:
            self._store.save_local(str(self._index_path))
        with open(self._registry_path, "w", encoding="utf-8") as f:
            json.dump(self._registry, f, indent=2, default=str)

    def _load(self) -> None:
        faiss_file = self._index_path / "index.faiss"
        if faiss_file.exists():
            try:
                self._store = FAISS.load_local(
                    str(self._index_path),
                    self._embeddings,
                    allow_dangerous_deserialization=True,
                )
                logger.info("Loaded FAISS index with %d vectors", self.index_size())
            except Exception as exc:
                logger.error("Could not load FAISS index: %s", exc)
                self._store = None

        if self._registry_path.exists():
            try:
                with open(self._registry_path, encoding="utf-8") as f:
                    self._registry = json.load(f)
            except Exception as exc:
                logger.error("Could not load registry: %s", exc)
                self._registry = {}


# ── Module-level singleton ────────────────────────────────────────────────────

_manager: Optional[VectorStoreManager] = None


def get_vector_store() -> VectorStoreManager:
    global _manager
    if _manager is None:
        _manager = VectorStoreManager()
    return _manager
