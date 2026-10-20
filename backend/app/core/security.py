"""Password hashing and JSON web token handling."""

from __future__ import annotations

import hmac
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from functools import lru_cache

import bcrypt
import jwt
from jwt import InvalidTokenError

from app.core.config import Settings, get_settings

ALGORITHM = "HS256"


@dataclass(frozen=True)
class AdminCredentials:
    """The single admin account of the shop."""

    username: str
    password_hash: str


def hash_password(password: str) -> str:
    """Return the bcrypt hash of a password."""
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


@lru_cache(maxsize=8)
def _hash_cached(password: str) -> str:
    """Hash a password once per process (bcrypt is intentionally slow)."""
    return hash_password(password)


def verify_password(password: str, password_hash: str) -> bool:
    """Return True when the password matches the hash."""
    try:
        return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))
    except ValueError:
        return False


def build_admin_credentials(settings: Settings | None = None) -> AdminCredentials:
    """Build the admin credentials from the configuration.

    The password from the environment is hashed with bcrypt; the plain text password is
    never stored.
    """
    active_settings = settings or get_settings()
    return AdminCredentials(
        username=active_settings.admin_username,
        password_hash=_hash_cached(active_settings.admin_password),
    )


def verify_admin_login(credentials: AdminCredentials, username: str, password: str) -> bool:
    """Return True when the given credentials are the admin ones."""
    username_matches = hmac.compare_digest(credentials.username, username)
    password_matches = verify_password(password, credentials.password_hash)
    return username_matches and password_matches


def create_access_token(subject: str, expires_minutes: int | None = None) -> tuple[str, int]:
    """Create a signed access token.

    Args:
        subject: the identity stored in the token (the admin username).
        expires_minutes: lifetime of the token; the configured value by default.

    Returns:
        A tuple of the encoded token and its lifetime in seconds.
    """
    settings = get_settings()
    lifetime = (
        expires_minutes if expires_minutes is not None else settings.access_token_expire_minutes
    )
    issued_at = datetime.now(UTC)
    payload = {
        "sub": subject,
        "iat": issued_at,
        "exp": issued_at + timedelta(minutes=lifetime),
    }
    token = jwt.encode(payload, settings.secret_key, algorithm=ALGORITHM)
    return token, lifetime * 60


def decode_access_token(token: str) -> str | None:
    """Return the subject of a valid token, or None when the token is invalid."""
    settings = get_settings()
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[ALGORITHM])
    except InvalidTokenError:
        return None
    subject = payload.get("sub")
    return subject if isinstance(subject, str) else None
