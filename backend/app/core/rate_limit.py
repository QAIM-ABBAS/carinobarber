"""A tiny in-memory rate limiter used to protect the booking and the login endpoints."""

from __future__ import annotations

import math
import threading
import time
from collections import deque

from fastapi import Request

from app.core.config import Settings, get_settings
from app.core.errors import AppError

WINDOW_SECONDS = 60

#: How many login attempts a single client IP may make per minute.
LOGIN_ATTEMPTS_PER_MINUTE = 5

#: How many OTP requests a single client IP may make per minute.
OTP_REQUESTS_PER_MINUTE = 10


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

    def retry_after(self, key: str) -> int:
        """Return the seconds until the key may hit the limiter again."""
        now = time.monotonic()
        with self._lock:
            hits = self._hits.get(key)
            if not hits:
                return 0
            while hits and now - hits[0] >= self.window_seconds:
                hits.popleft()
            if len(hits) < self.limit:
                return 0
            return max(1, math.ceil(self.window_seconds - (now - hits[0])))

    def reset(self) -> None:
        """Forget every recorded hit."""
        with self._lock:
            self._hits.clear()


_limiter: RateLimiter | None = None
_limiter_lock = threading.Lock()

_login_limiter: RateLimiter | None = None
_login_limiter_lock = threading.Lock()

_otp_limiter: RateLimiter | None = None
_otp_limiter_lock = threading.Lock()


def get_rate_limiter(settings: Settings | None = None) -> RateLimiter:
    """Return the shared limiter for the configured limit."""
    global _limiter
    limit = (settings or get_settings()).rate_limit_bookings_per_minute
    with _limiter_lock:
        if _limiter is None or _limiter.limit != limit:
            _limiter = RateLimiter(limit=limit)
        return _limiter


def get_login_rate_limiter() -> RateLimiter:
    """Return the shared limiter of the login endpoint."""
    global _login_limiter
    with _login_limiter_lock:
        if _login_limiter is None:
            _login_limiter = RateLimiter(limit=LOGIN_ATTEMPTS_PER_MINUTE)
        return _login_limiter


def get_otp_rate_limiter() -> RateLimiter:
    """Return the shared limiter of the OTP request endpoint (per client IP)."""
    global _otp_limiter
    with _otp_limiter_lock:
        if _otp_limiter is None:
            _otp_limiter = RateLimiter(limit=OTP_REQUESTS_PER_MINUTE)
        return _otp_limiter


def reset_rate_limiter() -> None:
    """Clear the recorded hits of every limiter (used by the test suite)."""
    global _limiter, _login_limiter, _otp_limiter
    with _limiter_lock:
        if _limiter is not None:
            _limiter.reset()
    with _login_limiter_lock:
        if _login_limiter is not None:
            _login_limiter.reset()
    with _otp_limiter_lock:
        if _otp_limiter is not None:
            _otp_limiter.reset()


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


def rate_limit_otp_request(request: Request) -> None:
    """Limit OTP requests per client IP.

    Raises:
        AppError: 429 ``otp_rate_limited`` with the seconds to wait.
    """
    key = client_key(request)
    limiter = get_otp_rate_limiter()
    if not limiter.allow(key):
        raise AppError(
            code="otp_rate_limited",
            message="تعداد درخواست کد بیش از حد مجاز است. لطفاً کمی بعد دوباره تلاش کنید.",
            status_code=429,
            details={"retry_after": limiter.retry_after(key)},
        )


def rate_limit_login(request: Request) -> None:
    """FastAPI dependency that rejects too many login attempts.

    Every attempt is counted (also the successful ones) so the endpoint cannot be
    brute forced.

    Raises:
        AppError: 429 ``rate_limited`` when the client exceeded the limit.
    """
    if not get_login_rate_limiter().allow(client_key(request)):
        raise AppError(
            code="rate_limited",
            message="تعداد تلاش‌های ورود بیش از حد مجاز است. کمی بعد دوباره تلاش کنید.",
            status_code=429,
        )
