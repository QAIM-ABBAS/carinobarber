"""Shared helpers for the test suite."""

from __future__ import annotations

from datetime import datetime
from zoneinfo import ZoneInfo

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import create_customer_token
from app.models.user import User
from app.services.sms import SmsProvider

SHOP_TZ = ZoneInfo("Asia/Tehran")
# Monday 2026-10-19, 09:30 in the shop timezone.
FIXED_NOW = datetime(2026, 10, 19, 9, 30, tzinfo=SHOP_TZ)
DEFAULT_CUSTOMER_PHONE = "09121234567"
DEFAULT_CUSTOMER_NAME = "علی رضایی"
#: The phone configured as ``ADMIN_PHONE`` in the test settings.
ADMIN_PHONE = "09129999999"
ADMIN_NAME = "مدیر باشگاه"


class SpySmsProvider(SmsProvider):
    """SMS provider that records the messages instead of sending them."""

    def __init__(self) -> None:
        self.messages: list[tuple[str, str]] = []

    def send(self, phone: str, text: str) -> None:
        self.messages.append((phone, text))

    @property
    def last_message(self) -> tuple[str, str]:
        assert self.messages, "no SMS was sent"
        return self.messages[-1]


def make_customer(
    session: Session,
    phone: str = DEFAULT_CUSTOMER_PHONE,
    name: str = DEFAULT_CUSTOMER_NAME,
) -> User:
    """Return the user of the phone, creating it when needed."""
    existing = session.scalars(select(User).where(User.phone == phone)).first()
    if existing is not None:
        return existing
    user = User(phone=phone, name=name)
    session.add(user)
    session.commit()
    return user


def customer_headers_for(
    session: Session,
    phone: str = DEFAULT_CUSTOMER_PHONE,
    name: str = DEFAULT_CUSTOMER_NAME,
) -> dict[str, str]:
    """Create (or reuse) a customer and return its bearer header."""
    user = make_customer(session, phone=phone, name=name)
    token, _ = create_customer_token(user.id)
    return {"Authorization": f"Bearer {token}"}
