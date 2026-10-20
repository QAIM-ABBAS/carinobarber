"""Application error type plus handlers that render the unified error envelope.

Every failing request answers with:

    {"error": {"code": "...", "message": "...", "details": null}}
"""

from __future__ import annotations

import logging
from typing import Any

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

logger = logging.getLogger("gc.errors")

STATUS_TO_CODE: dict[int, str] = {
    400: "bad_request",
    401: "unauthorized",
    403: "forbidden",
    404: "not_found",
    405: "method_not_allowed",
    409: "conflict",
    422: "validation_error",
    429: "rate_limited",
    500: "internal_error",
}

STATUS_TO_MESSAGE: dict[int, str] = {
    400: "درخواست نامعتبر است.",
    401: "برای انجام این کار باید وارد حساب مدیریت شوید.",
    403: "دسترسی به این بخش مجاز نیست.",
    404: "موردی با این مشخصات یافت نشد.",
    405: "روش درخواست مجاز نیست.",
    409: "این درخواست با وضعیت فعلی سازگار نیست.",
    422: "اطلاعات ارسالی معتبر نیست.",
    429: "تعداد درخواست‌ها بیش از حد مجاز است. کمی بعد دوباره تلاش کنید.",
    500: "خطای داخلی سرور رخ داد. لطفاً دوباره تلاش کنید.",
}


def error_body(code: str, message: str, details: Any = None) -> dict[str, Any]:
    """Build the unified error payload."""
    return {"error": {"code": code, "message": message, "details": details}}


class AppError(Exception):
    """Business error carrying a stable machine readable code and a Persian message."""

    def __init__(
        self,
        code: str,
        message: str,
        status_code: int = 400,
        details: Any = None,
    ) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.status_code = status_code
        self.details = details

    def to_body(self) -> dict[str, Any]:
        return error_body(self.code, self.message, self.details)


def _persian_validation_message(error: dict[str, Any]) -> str:
    """Translate a Pydantic error record into a Persian, user facing message."""
    kind = error.get("type", "")
    ctx = error.get("ctx") or {}

    if kind == "missing":
        return "این فیلد الزامی است."
    if kind in {"string_too_short", "string_length_too_short"}:
        minimum = ctx.get("min_length", 1)
        return f"طول مقدار باید حداقل {minimum} نویسه باشد."
    if kind in {"string_too_long", "string_length_too_long"}:
        maximum = ctx.get("max_length", 0)
        return f"طول مقدار نباید بیشتر از {maximum} نویسه باشد."
    if kind in {"int_parsing", "int_type", "float_parsing", "float_type"}:
        return "مقدار باید یک عدد صحیح باشد."
    if kind in {"greater_than", "greater_than_equal"}:
        bound = ctx.get("ge", ctx.get("gt", ""))
        return f"مقدار باید بزرگ‌تر یا مساوی {bound} باشد."
    if kind in {"less_than", "less_than_equal"}:
        bound = ctx.get("le", ctx.get("lt", ""))
        return f"مقدار باید کوچک‌تر یا مساوی {bound} باشد."
    if kind == "value_error":
        raw = str(error.get("msg", ""))
        # Custom validators raise ValueError with a Persian message.
        if any("\u0600" <= char <= "\u06ff" for char in raw):
            return raw
        return "مقدار ارسالی معتبر نیست."
    if kind == "literal_error":
        expected = ctx.get("expected", "")
        return f"مقدار ارسالی باید یکی از این موارد باشد: {expected}."
    if kind == "json_invalid":
        return "ساختار JSON ارسالی نامعتبر است."
    if kind == "extra_forbidden":
        return "فیلدهای اضافه مجاز نیستند."
    return "مقدار ارسالی معتبر نیست."


def _validation_details(exc: RequestValidationError) -> list[dict[str, str]]:
    details: list[dict[str, str]] = []
    for error in exc.errors():
        location = ".".join(str(part) for part in error.get("loc", ()) if part != "body")
        details.append(
            {
                "field": location or "body",
                "message": _persian_validation_message(error),
            }
        )
    return details


def register_exception_handlers(app: FastAPI) -> None:
    """Attach handlers so every error uses the unified envelope."""

    @app.exception_handler(AppError)
    async def _handle_app_error(_: Request, exc: AppError) -> JSONResponse:
        return JSONResponse(status_code=exc.status_code, content=exc.to_body())

    @app.exception_handler(RequestValidationError)
    async def _handle_validation_error(_: Request, exc: RequestValidationError) -> JSONResponse:
        return JSONResponse(
            status_code=422,
            content=error_body(
                "validation_error",
                "اطلاعات ارسالی معتبر نیست.",
                _validation_details(exc),
            ),
        )

    @app.exception_handler(StarletteHTTPException)
    async def _handle_http_error(_: Request, exc: StarletteHTTPException) -> JSONResponse:
        code = STATUS_TO_CODE.get(exc.status_code, "error")
        message = STATUS_TO_MESSAGE.get(exc.status_code, "خطایی رخ داد.")
        details = exc.detail if isinstance(exc.detail, (dict, list)) else None
        return JSONResponse(
            status_code=exc.status_code,
            content=error_body(code, message, details),
            headers=getattr(exc, "headers", None),
        )

    @app.exception_handler(Exception)
    async def _handle_unexpected_error(request: Request, exc: Exception) -> JSONResponse:
        logger.exception(
            "Unhandled error while processing %s %s (request_id=%s)",
            request.method,
            request.url.path,
            getattr(request.state, "request_id", "-"),
        )
        return JSONResponse(
            status_code=500,
            content=error_body(
                "internal_error",
                STATUS_TO_MESSAGE[500],
            ),
        )
