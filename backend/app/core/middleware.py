"""Request logging middleware, request ids and masking of sensitive data."""

from __future__ import annotations

import logging
import re
import time
from uuid import uuid4

from starlette.types import ASGIApp, Message, Receive, Scope, Send

from app.core.phone import mask_phone

logger = logging.getLogger("gc.request")

REQUEST_ID_HEADER = "x-request-id"
SENSITIVE_QUERY_PATTERN = re.compile(r"\b(phone|password|token|access_token)=([^&\s\"']+)")


def mask_sensitive_query(message: str) -> str:
    """Mask phone numbers and credentials inside a log message."""

    def _replace(match: re.Match[str]) -> str:
        key, value = match.group(1), match.group(2)
        if key == "phone":
            return f"{key}={mask_phone(value)}"
        return f"{key}=***"

    return SENSITIVE_QUERY_PATTERN.sub(_replace, message)


class SensitiveDataFilter(logging.Filter):
    """Logging filter that masks sensitive query parameters."""

    def filter(self, record: logging.LogRecord) -> bool:
        message = record.getMessage()
        masked = mask_sensitive_query(message)
        if masked != message:
            record.msg = masked
            record.args = ()
        return True


class RequestLoggingMiddleware:
    """Attach a request id to every request and log the request.

    The request id is taken from the ``X-Request-ID`` header (or generated) and is sent
    back in the response header. The logged line never contains the query string, so no
    phone number ends up in the log.
    """

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        request_id = self._extract_request_id(scope)
        scope.setdefault("state", {})["request_id"] = request_id
        started = time.perf_counter()
        status_code = 500

        async def send_wrapper(message: Message) -> None:
            nonlocal status_code
            if message["type"] == "http.response.start":
                status_code = message["status"]
                headers = message.setdefault("headers", [])
                headers.append((REQUEST_ID_HEADER.encode(), request_id.encode()))
            await send(message)

        try:
            await self.app(scope, receive, send_wrapper)
        finally:
            duration_ms = (time.perf_counter() - started) * 1000
            logger.info(
                "%s %s -> %s (%.1f ms) [%s]",
                scope.get("method", "-"),
                scope.get("path", "-"),
                status_code,
                duration_ms,
                request_id,
            )

    @staticmethod
    def _extract_request_id(scope: Scope) -> str:
        for key, value in scope.get("headers", []):
            if key.decode("latin-1").lower() == REQUEST_ID_HEADER:
                candidate = value.decode("latin-1").strip()
                if candidate:
                    return candidate[:64]
        return uuid4().hex
