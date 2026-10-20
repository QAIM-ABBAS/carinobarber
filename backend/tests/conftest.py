"""Shared pytest fixtures: SQLite in-memory database and API client."""

from __future__ import annotations

from collections.abc import Iterator
from datetime import datetime

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.config import Settings, get_settings
from app.core.rate_limit import reset_rate_limiter
from app.core.security import create_access_token
from app.core.timeutil import get_now
from app.db.base import Base
from app.db.session import get_db
from app.main import create_app
from app.seed import seed_database
from app.services.sms import set_sms_provider
from tests.helpers import FIXED_NOW, SpySmsProvider

TEST_DATABASE_URL = "sqlite+pysqlite:///:memory:"


@pytest.fixture(scope="session")
def settings() -> Settings:
    """Return deterministic settings for the test suite."""
    get_settings.cache_clear()
    return Settings(
        app_env="test",
        seed_on_start=False,
        rate_limit_bookings_per_minute=5,
        cors_origins=["http://testserver"],
    )


@pytest.fixture()
def now() -> datetime:
    """Return the frozen "current" moment used by every test."""
    return FIXED_NOW


@pytest.fixture()
def set_now(app):
    """Return a helper that moves the frozen clock to another moment."""

    def _set(moment: datetime) -> None:
        app.dependency_overrides[get_now] = lambda: moment

    return _set


@pytest.fixture(autouse=True)
def _clean_rate_limiter():
    """Make sure every test starts with an empty rate limiter."""
    reset_rate_limiter()
    yield
    reset_rate_limiter()


@pytest.fixture()
def sms_spy() -> Iterator[SpySmsProvider]:
    """Replace the SMS provider with a spy that records every message."""
    provider = SpySmsProvider()
    set_sms_provider(provider)
    yield provider
    set_sms_provider(None)


@pytest.fixture()
def engine():
    """Return a SQLite in-memory engine that keeps a single connection alive."""
    test_engine = create_engine(
        TEST_DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
        future=True,
    )
    Base.metadata.create_all(test_engine)
    yield test_engine
    test_engine.dispose()


@pytest.fixture()
def db_session(engine) -> Iterator[Session]:
    """Return a session bound to the in-memory database, seeded with the default data."""
    testing_session = sessionmaker(
        bind=engine,
        autocommit=False,
        autoflush=False,
        expire_on_commit=False,
        class_=Session,
    )
    with testing_session() as session:
        seed_database(session)
        yield session


@pytest.fixture()
def app(settings: Settings, db_session: Session, now: datetime):
    """Return a fresh application instance with the database and clock pinned."""
    application = create_app(settings)

    def override_get_db() -> Iterator[Session]:
        yield db_session

    application.dependency_overrides[get_db] = override_get_db
    application.dependency_overrides[get_now] = lambda: now
    return application


@pytest.fixture()
def admin_headers() -> dict[str, str]:
    """Return the authorization header of a logged in admin.

    The token is created directly (the login endpoint is covered by its own tests) to
    avoid a bcrypt verification in every single admin test.
    """
    token, _ = create_access_token("admin")
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture()
def client(app) -> Iterator[TestClient]:
    """Return a TestClient bound to the application."""
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
