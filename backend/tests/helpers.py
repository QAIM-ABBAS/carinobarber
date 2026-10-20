"""Shared helpers for the test suite."""

from __future__ import annotations

from datetime import datetime
from zoneinfo import ZoneInfo

from app.services.sms import SmsProvider

SHOP_TZ = ZoneInfo("Asia/Tehran")
# Monday 2026-10-19, 09:30 in the shop timezone.
FIXED_NOW = datetime(2026, 10, 19, 9, 30, tzinfo=SHOP_TZ)


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
