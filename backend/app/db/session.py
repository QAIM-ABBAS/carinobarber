"""Engine, session factory and the FastAPI database dependency."""

from __future__ import annotations

from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import get_settings

CONNECT_TIMEOUT_SECONDS = 10

settings = get_settings()

_engine_kwargs: dict[str, object] = {"pool_pre_ping": True, "future": True}
if settings.database_url.startswith("postgresql"):
    # Fail fast instead of hanging forever when the database is unreachable.
    _engine_kwargs["connect_args"] = {"connect_timeout": CONNECT_TIMEOUT_SECONDS}

engine = create_engine(settings.database_url, **_engine_kwargs)

SessionLocal = sessionmaker(
    bind=engine,
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,
    class_=Session,
)


def get_db() -> Generator[Session, None, None]:
    """Yield a database session and always close it afterwards."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
