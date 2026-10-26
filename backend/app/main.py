"""FastAPI application factory, lifespan, CORS and router wiring."""

from __future__ import annotations

import contextlib
import logging
import sys
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.v1.public import health_router
from app.api.v1.router import api_router
from app.core.config import Settings, get_settings
from app.core.errors import register_exception_handlers
from app.core.middleware import RequestLoggingMiddleware, SensitiveDataFilter
from app.core.security import build_admin_credentials

logger = logging.getLogger("gc")

API_TITLE = "باشگاه جنتلمن‌ها API"
API_DESCRIPTION = "API برای نمایش خدمات، بررسی نوبت‌های خالی و ثبت/لغو نوبت باشگاه جنتلمن‌ها."
API_VERSION = "1.0.0"
LOG_FORMAT = "%(asctime)s %(levelname)-8s %(name)s: %(message)s"


def configure_logging(level: int = logging.INFO) -> None:
    """Attach a stream handler to the application logger.

    Uvicorn only configures its own loggers, so the messages of the application
    (seed results, SMS previews, request logs) would be dropped without this.
    The output stream is switched to UTF-8 so the Persian messages stay readable.
    """
    with contextlib.suppress(AttributeError, ValueError):
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")

    app_logger = logging.getLogger("gc")
    if app_logger.handlers:
        return
    handler = logging.StreamHandler()
    handler.setFormatter(logging.Formatter(LOG_FORMAT))
    app_logger.addHandler(handler)
    app_logger.setLevel(level)
    app_logger.propagate = False

    # Uvicorn logs the full URL (including the query string) on its own access log.
    access_logger = logging.getLogger("uvicorn.access")
    if not any(isinstance(item, SensitiveDataFilter) for item in access_logger.filters):
        access_logger.addFilter(SensitiveDataFilter())


def _seed_database_on_startup() -> None:
    """Seed the default services and shop settings when SEED_ON_START is enabled."""
    from sqlalchemy.exc import SQLAlchemyError

    from app.db.session import SessionLocal
    from app.seed import seed_database

    try:
        with SessionLocal() as session:
            result = seed_database(session)
    except SQLAlchemyError as exc:
        logger.error("Could not seed the database: %s", exc)
        raise
    logger.info(
        "Seed finished (services_created=%d, settings_created=%s)",
        result.services_created,
        result.settings_created,
    )


def create_app(settings: Settings | None = None) -> FastAPI:
    """Build the FastAPI application.

    Args:
        settings: optional settings override; the cached settings are used by default.

    Returns:
        A configured FastAPI instance.

    Raises:
        RuntimeError: when the configuration is invalid or insecure.
    """
    app_settings = settings or get_settings()
    app_settings.validate_or_raise()
    configure_logging()

    if app_settings.otp_dev_mode and app_settings.is_production:
        logger.warning(
            "SECURITY WARNING: OTP_DEV_MODE is enabled in production. "
            "Login codes are returned in API responses. "
            "Set OTP_DEV_MODE=false and configure a real SMS provider."
        )

    @asynccontextmanager
    async def lifespan(_: FastAPI) -> AsyncIterator[None]:
        app.state.admin_credentials = build_admin_credentials(app_settings)
        if app_settings.seed_on_start:
            _seed_database_on_startup()
        logger.info(
            "API started (env=%s, timezone=%s)", app_settings.app_env, app_settings.shop_timezone
        )
        yield
        logger.info("API stopped")

    app = FastAPI(
        title=API_TITLE,
        description=API_DESCRIPTION,
        version=API_VERSION,
        lifespan=lifespan,
    )
    app.state.settings = app_settings

    # The uploaded service images. The directory has to exist before the static
    # files app is mounted (the named docker volume starts empty).
    upload_dir = Path(app_settings.upload_dir)
    (upload_dir / "services").mkdir(parents=True, exist_ok=True)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=app_settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.add_middleware(RequestLoggingMiddleware)

    app.include_router(api_router, prefix="/api/v1")
    app.include_router(health_router)
    app.mount("/api/v1/media", StaticFiles(directory=upload_dir), name="media")

    register_exception_handlers(app)
    return app


app = create_app()
