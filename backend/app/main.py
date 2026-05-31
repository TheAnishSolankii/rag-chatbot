"""
FastAPI application — entry point.

Startup order:
  1. Logging configured
  2. Required directories created
  3. FAISS index loaded (or created fresh)
  4. Middleware attached (CORS, rate limiter, gzip)
  5. Routers mounted under /api
  6. Health + docs endpoints registered
"""
import logging
import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse

from app.config import get_settings
from app.auth.routes import router as auth_router
from app.api.documents import router as documents_router
from app.api.chat import router as chat_router
from app.api.admin import router as admin_router
from app.core.vector_store import get_vector_store
from app.database import init_db
from app.middleware.rate_limiter import SlidingWindowRateLimiter
from app.models.schemas import HealthResponse

# ── Logging ───────────────────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%S",
)
logger = logging.getLogger(__name__)
settings = get_settings()


# ── Lifespan ──────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Run startup/shutdown logic."""
    logger.info("Starting %s v%s [%s]", settings.APP_NAME, settings.APP_VERSION, settings.ENVIRONMENT)

    # Ensure data directories exist
    for d in [settings.UPLOAD_DIR, settings.FAISS_INDEX_PATH]:
        Path(d).mkdir(parents=True, exist_ok=True)

    # Initialise SQLite / PostgreSQL (creates tables + seeds demo users)
    init_db()

    # Pre-warm the vector store (loads existing FAISS index from disk)
    vs = get_vector_store()
    logger.info("Vector store ready — %d documents, %d vectors", vs.document_count(), vs.index_size())

    yield  # ← application runs here

    logger.info("Shutting down %s", settings.APP_NAME)


# ── App factory ───────────────────────────────────────────────────────────────

def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        description="Production-ready RAG Chatbot API powered by GPT-4.1 and FAISS",
        docs_url="/docs" if settings.DEBUG else None,   # hide Swagger in production
        redoc_url="/redoc" if settings.DEBUG else None,
        lifespan=lifespan,
    )

    # ── Middleware (order matters — outermost first) ───────────────────────────
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.ALLOWED_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.add_middleware(GZipMiddleware, minimum_size=500)
    app.add_middleware(SlidingWindowRateLimiter)

    # ── Routers ───────────────────────────────────────────────────────────────
    app.include_router(auth_router, prefix="/api")
    app.include_router(documents_router, prefix="/api")
    app.include_router(chat_router, prefix="/api")
    app.include_router(admin_router, prefix="/api")

    # ── Global exception handler ──────────────────────────────────────────────
    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception):
        logger.exception("Unhandled exception on %s: %s", request.url.path, exc)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"detail": "An internal server error occurred."},
        )

    # ── Health check ──────────────────────────────────────────────────────────
    @app.get(
        "/health",
        response_model=HealthResponse,
        tags=["System"],
        summary="Health check",
    )
    async def health():
        vs = get_vector_store()
        return HealthResponse(
            status="ok",
            version=settings.APP_VERSION,
            faiss_index_size=vs.index_size(),
            document_count=vs.document_count(),
        )

    @app.get("/", tags=["System"], include_in_schema=False)
    async def root():
        return {"name": settings.APP_NAME, "version": settings.APP_VERSION, "status": "ok"}

    return app


app = create_app()
