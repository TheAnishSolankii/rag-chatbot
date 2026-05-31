"""
PDF processing pipeline:
  1. Extract text per-page with PyMuPDF (fitz) — fast, accurate
  2. Clean and normalise text
  3. Chunk with LangChain's RecursiveCharacterTextSplitter
     (respects sentence / paragraph boundaries)
  4. Return enriched Document objects with page-level metadata
"""
import io
import logging
import uuid
from pathlib import Path
from typing import List

import fitz  # PyMuPDF
from langchain.schema import Document
from langchain.text_splitter import RecursiveCharacterTextSplitter

from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


class PDFProcessor:
    def __init__(self):
        self.splitter = RecursiveCharacterTextSplitter(
            chunk_size=settings.CHUNK_SIZE,
            chunk_overlap=settings.CHUNK_OVERLAP,
            separators=["\n\n", "\n", ". ", "! ", "? ", " ", ""],
            length_function=len,
        )

    # ── Public API ────────────────────────────────────────────────────────────

    def process(self, file_bytes: bytes, filename: str, doc_id: str) -> List[Document]:
        """
        Full pipeline: bytes → cleaned, chunked LangChain Documents.

        Each Document carries metadata:
          - doc_id      : stable UUID for the uploaded file
          - filename    : original filename shown in citations
          - page        : 1-based page number
          - chunk_index : sequential chunk number within the file
          - total_pages : total pages in the PDF
        """
        raw_pages = self._extract_pages(file_bytes, filename)
        docs = self._chunk_pages(raw_pages, doc_id, filename)
        logger.info(
            "Processed '%s': %d pages → %d chunks", filename, len(raw_pages), len(docs)
        )
        return docs

    def get_page_count(self, file_bytes: bytes) -> int:
        with fitz.open(stream=file_bytes, filetype="pdf") as pdf:
            return pdf.page_count

    # ── Internal helpers ──────────────────────────────────────────────────────

    def _extract_pages(self, file_bytes: bytes, filename: str) -> List[dict]:
        """Return list of {page, text} dicts — one per page."""
        pages = []
        try:
            with fitz.open(stream=file_bytes, filetype="pdf") as pdf:
                total = pdf.page_count
                for page_num in range(total):
                    page = pdf[page_num]
                    text = page.get_text("text")         # plain UTF-8 text
                    text = self._clean_text(text)
                    if text.strip():                      # skip blank pages
                        pages.append({
                            "page": page_num + 1,         # 1-based
                            "total_pages": total,
                            "text": text,
                        })
        except Exception as exc:
            logger.error("Failed to extract PDF '%s': %s", filename, exc)
            raise ValueError(f"Could not read PDF file: {exc}") from exc
        return pages

    def _chunk_pages(
        self, pages: List[dict], doc_id: str, filename: str
    ) -> List[Document]:
        """Split each page's text into overlapping chunks."""
        all_docs: List[Document] = []
        for page_info in pages:
            page_docs = self.splitter.create_documents(
                texts=[page_info["text"]],
                metadatas=[{
                    "doc_id": doc_id,
                    "filename": filename,
                    "page": page_info["page"],
                    "total_pages": page_info["total_pages"],
                }],
            )
            # Add sequential chunk_index within the file
            for i, doc in enumerate(page_docs):
                doc.metadata["chunk_index"] = len(all_docs) + i
            all_docs.extend(page_docs)
        return all_docs

    @staticmethod
    def _clean_text(text: str) -> str:
        """Remove excessive whitespace and non-printable characters."""
        import re
        # Collapse multiple newlines → two at most
        text = re.sub(r"\n{3,}", "\n\n", text)
        # Remove null bytes and other control chars (keep \n \t)
        text = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]", "", text)
        # Collapse multiple spaces
        text = re.sub(r" {2,}", " ", text)
        return text.strip()
