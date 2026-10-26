"""Shared FastAPI dependencies."""

from __future__ import annotations

from fastapi import Depends, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.errors import AppError
from app.core.security import ADMIN_ROLE, CUSTOMER_ROLE, decode_token
from app.db.session import get_db
from app.models.user import User

bearer_scheme = HTTPBearer(auto_error=False)

ADMIN_UNAUTHORIZED_MESSAGE = "برای انجام این کار باید وارد حساب مدیریت شوید."
CUSTOMER_UNAUTHORIZED_MESSAGE = "برای انجام این کار باید وارد حساب کاربری شوید."


def get_current_admin(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> str:
    """Return the username of the admin behind the bearer token.

    Only tokens carrying ``role="admin"`` are accepted.

    Raises:
        AppError: 401 ``unauthorized`` when the token is missing or invalid.
    """
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise AppError(code="unauthorized", message=ADMIN_UNAUTHORIZED_MESSAGE, status_code=401)

    payload = decode_token(credentials.credentials)
    if payload is None or payload.role != ADMIN_ROLE:
        raise AppError(code="unauthorized", message=ADMIN_UNAUTHORIZED_MESSAGE, status_code=401)

    expected = getattr(request.app.state, "admin_credentials", None)
    if expected is not None and payload.subject != expected.username:
        raise AppError(code="unauthorized", message=ADMIN_UNAUTHORIZED_MESSAGE, status_code=401)
    return payload.subject


def get_current_customer(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    """Return the customer behind the bearer token.

    Only tokens carrying ``role="customer"`` and the id of an existing user are
    accepted. Admin tokens can never open a customer endpoint.

    Raises:
        AppError: 401 ``unauthorized`` when the token is missing or invalid.
    """
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise AppError(
            code="unauthorized", message=CUSTOMER_UNAUTHORIZED_MESSAGE, status_code=401
        )

    payload = decode_token(credentials.credentials)
    if payload is None or payload.role != CUSTOMER_ROLE:
        raise AppError(
            code="unauthorized", message=CUSTOMER_UNAUTHORIZED_MESSAGE, status_code=401
        )

    try:
        user_id = int(payload.subject)
    except ValueError:
        raise AppError(
            code="unauthorized", message=CUSTOMER_UNAUTHORIZED_MESSAGE, status_code=401
        ) from None

    user = db.get(User, user_id)
    if user is None:
        raise AppError(
            code="unauthorized", message=CUSTOMER_UNAUTHORIZED_MESSAGE, status_code=401
        )
    return user
