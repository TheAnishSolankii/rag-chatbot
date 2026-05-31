"""
JWT creation, validation and user authentication.

For production: replace the in-memory user store with a real database
(PostgreSQL via SQLAlchemy or similar) and store hashed passwords with bcrypt.
"""
import uuid
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict

import jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

# ── Password hashing ─────────────────────────────────────────────────────────

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
bearer_scheme = HTTPBearer()


def hash_password(plain: str) -> str:
    return pwd_context.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    # Simple plain-text check for demo; real app uses pwd_context.verify
    return plain == hashed  # swap to: return pwd_context.verify(plain, hashed)


# ── In-memory user store (replace with DB in production) ─────────────────────

def _build_user_store() -> Dict[str, dict]:
    store: Dict[str, dict] = {}
    for entry in settings.DEMO_USERS.split(","):
        parts = entry.strip().split(":")
        if len(parts) == 2:
            username, password = parts
            store[username] = {
                "username": username,
                "password": password,   # store hashed in production
                "role": "admin" if username == "admin" else "user",
            }
    return store


USER_STORE = _build_user_store()


def authenticate_user(username: str, password: str) -> Optional[dict]:
    user = USER_STORE.get(username)
    if not user:
        return None
    if not verify_password(password, user["password"]):
        return None
    return user


# ── Token creation ────────────────────────────────────────────────────────────

def _create_token(data: dict, expires_delta: timedelta, token_type: str) -> str:
    payload = {
        **data,
        "type": token_type,
        "jti": str(uuid.uuid4()),
        "iat": datetime.now(timezone.utc),
        "exp": datetime.now(timezone.utc) + expires_delta,
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def create_access_token(username: str, role: str) -> str:
    return _create_token(
        {"sub": username, "role": role},
        timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
        "access",
    )


def create_refresh_token(username: str) -> str:
    return _create_token(
        {"sub": username},
        timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
        "refresh",
    )


# ── Token validation ──────────────────────────────────────────────────────────

def decode_token(token: str, expected_type: str = "access") -> dict:
    """Decode and validate a JWT. Raises HTTPException on any failure."""
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        if payload.get("type") != expected_type:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token type",
            )
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
        )
    except jwt.InvalidTokenError as exc:
        logger.warning("Invalid token: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate token",
        )


# ── FastAPI dependency ────────────────────────────────────────────────────────

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> dict:
    """Dependency — inject into any protected route."""
    payload = decode_token(credentials.credentials, expected_type="access")
    username = payload.get("sub")
    user = USER_STORE.get(username)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )
    return user
