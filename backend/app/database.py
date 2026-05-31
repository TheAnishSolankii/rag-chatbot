"""
Database layer — SQLAlchemy + SQLite (default) or PostgreSQL.

Switch from SQLite → PostgreSQL simply by setting DATABASE_URL in .env:
  DATABASE_URL=postgresql+psycopg2://user:pass@localhost:5432/ragdb

Tables:
  users        — authentication, roles
  audit_log    — every document upload/delete for traceability
"""
import logging
from datetime import datetime, timezone
from typing import Optional, List

from sqlalchemy import (
    Boolean, Column, DateTime, Enum, Integer, String, Text,
    create_engine, event,
)
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker
from passlib.context import CryptContext

from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

# ── Engine ────────────────────────────────────────────────────────────────────

DATABASE_URL = getattr(settings, "DATABASE_URL", "sqlite:///./data/ragchatbot.db")

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args,
    pool_pre_ping=True,
    echo=settings.DEBUG,
)

# Enable WAL mode for SQLite (much better concurrent read performance)
if DATABASE_URL.startswith("sqlite"):
    @event.listens_for(engine, "connect")
    def _set_sqlite_pragma(dbapi_conn, _):
        cursor = dbapi_conn.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# ── Models ────────────────────────────────────────────────────────────────────

class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"

    id         = Column(Integer, primary_key=True, index=True)
    username   = Column(String(64), unique=True, nullable=False, index=True)
    email      = Column(String(255), unique=True, nullable=True)
    hashed_pw  = Column(String(255), nullable=False)
    role       = Column(Enum("admin", "user", name="user_role"), default="user", nullable=False)
    is_active  = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    last_login = Column(DateTime(timezone=True), nullable=True)

    def __repr__(self):
        return f"<User {self.username} [{self.role}]>"


class AuditLog(Base):
    __tablename__ = "audit_log"

    id         = Column(Integer, primary_key=True, index=True)
    username   = Column(String(64), nullable=False, index=True)
    action     = Column(String(64), nullable=False)   # upload | delete | login
    detail     = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


# ── Password helpers ──────────────────────────────────────────────────────────

_pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(plain: str) -> str:
    return _pwd.hash(plain)

def verify_password(plain: str, hashed: str) -> bool:
    return _pwd.verify(plain, hashed)

# ── CRUD helpers ──────────────────────────────────────────────────────────────

def get_user(db: Session, username: str) -> Optional[User]:
    return db.query(User).filter(User.username == username, User.is_active == True).first()


def create_user(db: Session, username: str, password: str,
                email: str = None, role: str = "user") -> User:
    user = User(
        username=username,
        email=email,
        hashed_pw=hash_password(password),
        role=role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    logger.info("Created user: %s [%s]", username, role)
    return user


def list_users(db: Session) -> List[User]:
    return db.query(User).filter(User.is_active == True).all()


def deactivate_user(db: Session, username: str) -> bool:
    user = get_user(db, username)
    if not user:
        return False
    user.is_active = False
    db.commit()
    return True


def record_login(db: Session, username: str):
    user = get_user(db, username)
    if user:
        user.last_login = datetime.now(timezone.utc)
        db.commit()


def log_audit(db: Session, username: str, action: str, detail: str = None):
    db.add(AuditLog(username=username, action=action, detail=detail))
    db.commit()

# ── FastAPI dependency ────────────────────────────────────────────────────────

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ── Initialisation ────────────────────────────────────────────────────────────

def init_db():
    """Create all tables and seed default users if the table is empty."""
    import os
    from pathlib import Path
    Path("./data").mkdir(parents=True, exist_ok=True)

    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        if db.query(User).count() == 0:
            logger.info("Seeding default users from DEMO_USERS env var…")
            for entry in settings.DEMO_USERS.split(","):
                parts = entry.strip().split(":")
                if len(parts) == 2:
                    uname, pwd = parts
                    role = "admin" if uname == "admin" else "user"
                    create_user(db, uname, pwd, role=role)
            logger.info("Default users created.")
    finally:
        db.close()
