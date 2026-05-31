"""
Admin-only routes — /api/admin/*

All routes require role == "admin".
Provides user management, system statistics, and audit log viewing.
"""
import logging
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.auth.jwt_handler import get_current_user
from app.config import get_settings
from app.core.vector_store import VectorStoreManager, get_vector_store
from app.database import (
    AuditLog, User, create_user, deactivate_user,
    get_db, get_user, list_users, log_audit,
)

logger = logging.getLogger(__name__)
settings = get_settings()
router = APIRouter(prefix="/admin", tags=["Admin"])


# ── Admin guard dependency ────────────────────────────────────────────────────

def require_admin(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required.",
        )
    return user


# ── Schemas ───────────────────────────────────────────────────────────────────

class UserOut(BaseModel):
    id: int
    username: str
    email: Optional[str]
    role: str
    is_active: bool
    created_at: datetime
    last_login: Optional[datetime]

    class Config:
        from_attributes = True


class CreateUserRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=64, pattern=r"^[a-zA-Z0-9_\-]+$")
    password: str = Field(..., min_length=8, max_length=128)
    email: Optional[str] = None
    role: str = Field(default="user", pattern=r"^(admin|user)$")


class AuditLogOut(BaseModel):
    id: int
    username: str
    action: str
    detail: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class SystemStatsOut(BaseModel):
    total_users: int
    active_users: int
    total_documents: int
    total_vectors: int
    total_audit_events: int
    server_time: datetime


# ── Routes ────────────────────────────────────────────────────────────────────

@router.get("/stats", response_model=SystemStatsOut, summary="System statistics")
async def system_stats(
    _admin: dict = Depends(require_admin),
    vs: VectorStoreManager = Depends(get_vector_store),
    db: Session = Depends(get_db),
):
    all_users = db.query(User).all()
    return SystemStatsOut(
        total_users=len(all_users),
        active_users=sum(1 for u in all_users if u.is_active),
        total_documents=vs.document_count(),
        total_vectors=vs.index_size(),
        total_audit_events=db.query(AuditLog).count(),
        server_time=datetime.now(timezone.utc),
    )


@router.get("/users", response_model=List[UserOut], summary="List all users")
async def list_all_users(
    _admin: dict = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return db.query(User).order_by(User.created_at.desc()).all()


@router.post("/users", response_model=UserOut, status_code=status.HTTP_201_CREATED,
             summary="Create a new user")
async def create_new_user(
    payload: CreateUserRequest,
    admin: dict = Depends(require_admin),
    db: Session = Depends(get_db),
):
    existing = get_user(db, payload.username)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Username '{payload.username}' already exists.",
        )
    user = create_user(db, payload.username, payload.password, payload.email, payload.role)
    log_audit(db, admin["username"], "create_user", f"Created user: {payload.username} [{payload.role}]")
    logger.info("Admin %s created user %s", admin["username"], payload.username)
    return user


@router.delete("/users/{username}", summary="Deactivate a user")
async def deactivate(
    username: str,
    admin: dict = Depends(require_admin),
    db: Session = Depends(get_db),
):
    if username == admin["username"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot deactivate your own account.",
        )
    success = deactivate_user(db, username)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
    log_audit(db, admin["username"], "deactivate_user", f"Deactivated: {username}")
    return {"message": f"User '{username}' deactivated.", "username": username}


@router.get("/audit-log", response_model=List[AuditLogOut], summary="View audit log")
async def get_audit_log(
    _admin: dict = Depends(require_admin),
    db: Session = Depends(get_db),
    limit: int = Query(default=50, le=200),
    username: Optional[str] = Query(default=None),
    action: Optional[str] = Query(default=None),
):
    q = db.query(AuditLog)
    if username:
        q = q.filter(AuditLog.username == username)
    if action:
        q = q.filter(AuditLog.action == action)
    return q.order_by(AuditLog.created_at.desc()).limit(limit).all()
