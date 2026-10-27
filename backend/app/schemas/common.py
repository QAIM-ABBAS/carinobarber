"""Shared schemas: the unified error envelope."""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class ErrorBody(BaseModel):
    """The single error object used by every failing request."""

    code: str = Field(description="Machine readable error code")
    message: str = Field(description="Persian, user facing message")
    details: Any = Field(default=None, description="Optional extra information")


class ErrorResponse(BaseModel):
    """Envelope of every error response."""

    error: ErrorBody


ERROR_RESPONSES: dict[int | str, dict[str, Any]] = {
    400: {"model": ErrorResponse, "description": "درخواست نامعتبر"},
    401: {"model": ErrorResponse, "description": "دسترسی غیرمجاز"},
    403: {"model": ErrorResponse, "description": "دسترسی به این بخش مجاز نیست"},
    404: {"model": ErrorResponse, "description": "موردی یافت نشد"},
    409: {"model": ErrorResponse, "description": "تعارض در وضعیت فعلی"},
    422: {"model": ErrorResponse, "description": "اطلاعات نامعتبر"},
    429: {"model": ErrorResponse, "description": "تعداد درخواست‌ها بیش از حد مجاز"},
}
