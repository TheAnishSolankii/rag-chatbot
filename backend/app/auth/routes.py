"""Auth router — /api/auth/*"""
from fastapi import APIRouter, HTTPException, status
from app.models.schemas import LoginRequest, TokenResponse, RefreshRequest, UserInfo
from app.auth.jwt_handler import (
    authenticate_user,
    create_access_token,
    create_refresh_token,
    decode_token,
    USER_STORE,
    get_current_user,
)
from app.config import get_settings
from fastapi import Depends

router = APIRouter(prefix="/auth", tags=["Authentication"])
settings = get_settings()


@router.post("/login", response_model=TokenResponse, summary="Obtain JWT tokens")
async def login(payload: LoginRequest):
    user = authenticate_user(payload.username, payload.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )
    access_token = create_access_token(user["username"], user["role"])
    refresh_token = create_refresh_token(user["username"])
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


@router.post("/refresh", response_model=TokenResponse, summary="Refresh access token")
async def refresh(payload: RefreshRequest):
    data = decode_token(payload.refresh_token, expected_type="refresh")
    username = data.get("sub")
    user = USER_STORE.get(username)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    access_token = create_access_token(user["username"], user["role"])
    new_refresh = create_refresh_token(user["username"])
    return TokenResponse(
        access_token=access_token,
        refresh_token=new_refresh,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


@router.get("/me", response_model=UserInfo, summary="Current user info")
async def me(user: dict = Depends(get_current_user)):
    return UserInfo(username=user["username"], role=user["role"])
