"""A tiny in-memory rate limiter used to protect the booking endpoint."""

from __future__ import annotations

import threading
import time
from collections import deque

from fastapi import Request

from app.core.config import Settings, get_settings
from app.core.errors import AppError

WINDOW_SECONDS = 60


class RateLimiter:
    """Sliding window limiter: keeps the timestamps of the recent hits per key."""

    def __init__(self, limit: int, window_seconds: int = WINDOW_SECONDS) -> None:
        if limit < 1:
            raise ValueError("limit must be a positive number")
        self.limit = limit
        self.window_seconds = window_seconds
        self._hits: dict[str, deque[float]] = {}
        self._lock = threading.Lock()

    def allow(self, key: str) -> bool:
        """Register a hit for the key and return False when the limit is exceeded."""
        now = time.monotonic()
        with self._lock:
            hits = self._hits.setdefault(key, deque())
            while hits and now - hits[0] >= self.window_seconds:
                hits.popleft()
            if len(hits) >= self.limit:
                return False
            hits.append(now)
            return True

    def reset(self) -> None:
        """Forget every recorded hit."""
        with self._lock:
            self._hits.clear()


_limiter: RateLimiter | None = None
_limiter_lock = threading.Lock()


def get_rate_limiter(settings: Settings | None = None) -> RateLimiter:
    """Return the shared limiter for the configured limit."""
    global _limiter
    limit = (settings or get_settings()).rate_limit_bookings_per_minute
    with _limiter_lock:
        if _limiter is None or _limiter.limit != limit:
            _limiter = RateLimiter(limit=limit)
        return _limiter


def reset_rate_limiter() -> None:
    """Clear the recorded hits (used by the test suite)."""
    global _limiter
    with _limiter_lock:
        if _limiter is not None:
            _limiter.reset()


def client_key(request: Request) -> str:
    """Return the key of the caller: the IP address of the direct connection."""
    client = request.client
    return client.host if client is not None else "unknown"


def rate_limit_bookings(request: Request) -> None:
    """FastAPI dependency that rejects too many booking attempts.

    Raises:
        AppError: 429 ``rate_limited`` when the client exceeded the limit.
    """
    settings = getattr(request.app.state, "settings", None) or get_settings()
    limiter = get_rate_limiter(settings)
    if not limiter.allow(client_key(request)):
        raise AppError(
            code="rate_limited",
            message="تعداد درخواست‌ها بیش از حد مجاز است. کمی بعد دوباره تلاش کنید.",
            status_code=429,
        )
