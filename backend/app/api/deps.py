"""Shared FastAPI dependencies."""

from __future__ import annotations

from fastapi import Depends, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.errors import AppError
from app.core.security import decode_access_token

bearer_scheme = HTTPBearer(auto_error=False)

UNAUTHORIZED_MESSAGE = "برای انجام این کار باید وارد حساب مدیریت شوید."


def get_current_admin(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> str:
    """Return the username of the admin behind the bearer token.

    Raises:
        AppError: 401 ``unauthorized`` when the token is missing or invalid.
    """
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise AppError(code="unauthorized", message=UNAUTHORIZED_MESSAGE, status_code=401)

    subject = decode_access_token(credentials.credentials)
    if subject is None:
        raise AppError(code="unauthorized", message=UNAUTHORIZED_MESSAGE, status_code=401)

    expected = getattr(request.app.state, "admin_credentials", None)
    if expected is not None and subject != expected.username:
        raise AppError(code="unauthorized", message=UNAUTHORIZED_MESSAGE, status_code=401)
    return subject
