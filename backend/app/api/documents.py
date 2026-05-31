"""
Document management routes — /api/documents/*

Upload flow:
  POST /upload  →  save file → extract text → chunk → embed → store in FAISS
"""
import logging
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import List

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import JSONResponse

from app.auth.jwt_handler import get_current_user
from app.config import get_settings
from app.core.pdf_processor import PDFProcessor
from app.core.vector_store import VectorStoreManager, get_vector_store
from app.models.schemas import (
    DeleteDocumentResponse,
    DocumentListResponse,
    DocumentMeta,
)

logger = logging.getLogger(__name__)
settings = get_settings()

router = APIRouter(prefix="/documents", tags=["Documents"])
pdf_processor = PDFProcessor()

MAX_BYTES = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024


# ── Helper ────────────────────────────────────────────────────────────────────

def _ensure_upload_dir() -> Path:
    p = Path(settings.UPLOAD_DIR)
    p.mkdir(parents=True, exist_ok=True)
    return p


# ── Routes ────────────────────────────────────────────────────────────────────

@router.post("/upload", summary="Upload and index a PDF document")
async def upload_document(
    file: UploadFile = File(...),
    _user: dict = Depends(get_current_user),
    vs: VectorStoreManager = Depends(get_vector_store),
):
    # ── Validate ──────────────────────────────────────────────────────────────
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Only PDF files are supported.",
        )

    content = await file.read()
    if len(content) > MAX_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds maximum size of {settings.MAX_UPLOAD_SIZE_MB} MB.",
        )
    if len(content) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty.",
        )

    doc_id = str(uuid.uuid4())

    # ── Save raw file ─────────────────────────────────────────────────────────
    upload_dir = _ensure_upload_dir()
    dest = upload_dir / f"{doc_id}.pdf"
    dest.write_bytes(content)

    # ── Process & index ────────────────────────────────────────────────────────
    try:
        page_count = pdf_processor.get_page_count(content)
        documents = pdf_processor.process(content, file.filename, doc_id)
    except ValueError as exc:
        dest.unlink(missing_ok=True)
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc))

    if not documents:
        dest.unlink(missing_ok=True)
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Could not extract any text from this PDF.",
        )

    try:
        vs.add_documents(
            documents,
            doc_id=doc_id,
            filename=file.filename,
            page_count=page_count,
            size_bytes=len(content),
        )
    except Exception as exc:
        dest.unlink(missing_ok=True)
        logger.exception("Failed to index document: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to index document. Check server logs.",
        )

    meta = vs.get_doc_meta(doc_id)
    return DocumentMeta(**meta)


@router.get("/", response_model=DocumentListResponse, summary="List all indexed documents")
async def list_documents(
    _user: dict = Depends(get_current_user),
    vs: VectorStoreManager = Depends(get_vector_store),
):
    docs = [DocumentMeta(**d) for d in vs.get_registry()]
    return DocumentListResponse(documents=docs, total=len(docs))


@router.delete("/{doc_id}", response_model=DeleteDocumentResponse, summary="Delete a document")
async def delete_document(
    doc_id: str,
    _user: dict = Depends(get_current_user),
    vs: VectorStoreManager = Depends(get_vector_store),
):
    # Remove the stored PDF file too
    pdf_path = Path(settings.UPLOAD_DIR) / f"{doc_id}.pdf"
    pdf_path.unlink(missing_ok=True)

    deleted = vs.delete_document(doc_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found.")

    return DeleteDocumentResponse(message="Document deleted successfully.", doc_id=doc_id)
