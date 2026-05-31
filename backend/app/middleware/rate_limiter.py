"""
Sliding-window rate limiter implemented as a FastAPI middleware.

Uses an in-memory deque per (IP, route) key.
For distributed deployments swap the deque with Redis + INCR / EXPIRE.
"""
import time
import logging
from collections import defaultdict, deque
from typing import Dict, Deque

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

# Routes that are rate-limited (prefix match)
RATE_LIMITED_PREFIXES = ["/api/chat", "/api/documents"]


class SlidingWindowRateLimiter(BaseHTTPMiddleware):
    """
    Allows RATE_LIMIT_PER_MINUTE requests per minute per client IP.
    Returns 429 with Retry-After header when the limit is exceeded.
    """

    def __init__(self, app, requests_per_minute: int = None, window_seconds: int = 60):
        super().__init__(app)
        self.limit = requests_per_minute or settings.RATE_LIMIT_PER_MINUTE
        self.window = window_seconds
        # key: (ip, path_prefix) → deque of timestamps
        self._store: Dict[str, Deque[float]] = defaultdict(deque)

    async def dispatch(self, request: Request, call_next) -> Response:
        path = request.url.path

        # Only rate-limit specific routes
        if not any(path.startswith(p) for p in RATE_LIMITED_PREFIXES):
            return await call_next(request)

        client_ip = self._get_client_ip(request)
        key = f"{client_ip}:{path.split('/')[2] if len(path.split('/')) > 2 else path}"

        now = time.monotonic()
        window_start = now - self.window
        q = self._store[key]

        # Evict timestamps outside the window
        while q and q[0] < window_start:
            q.popleft()

        if len(q) >= self.limit:
            retry_after = int(self.window - (now - q[0])) + 1
            logger.warning("Rate limit exceeded for %s on %s", client_ip, path)
            return JSONResponse(
                status_code=429,
                content={
                    "detail": f"Rate limit exceeded. Try again in {retry_after}s.",
                    "retry_after": retry_after,
                },
                headers={"Retry-After": str(retry_after)},
            )

        q.append(now)
        response = await call_next(request)

        # Expose rate-limit headers
        response.headers["X-RateLimit-Limit"] = str(self.limit)
        response.headers["X-RateLimit-Remaining"] = str(self.limit - len(q))
        response.headers["X-RateLimit-Reset"] = str(int(time.time() + self.window))
        return response

    @staticmethod
    def _get_client_ip(request: Request) -> str:
        """Respect X-Forwarded-For when running behind a proxy / nginx."""
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            return forwarded.split(",")[0].strip()
        if request.client:
            return request.client.host
        return "unknown"
