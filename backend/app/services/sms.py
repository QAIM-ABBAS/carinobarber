"""SMS providers. Only a console implementation exists for now."""

from __future__ import annotations

import logging
from abc import ABC, abstractmethod

from app.core.config import get_settings
from app.core.phone import mask_phone

logger = logging.getLogger("gc.sms")


class SmsProvider(ABC):
    """Interface every SMS provider must implement."""

    @abstractmethod
    def send(self, phone: str, text: str) -> None:
        """Send a text message to the given phone number.

        Args:
            phone: the normalized recipient number.
            text: the message body.

        Raises:
            Exception: provider specific failures; callers must handle them.
        """


class ConsoleSmsProvider(SmsProvider):
    """Logs the message instead of sending it to a real gateway."""

    def send(self, phone: str, text: str) -> None:
        logger.info("SMS | to=%s | %s", phone, text)


def build_provider(name: str) -> SmsProvider:
    """Return the provider implementation for the given name.

    Raises:
        ValueError: when the provider is not implemented.
    """
    if name == "console":
        return ConsoleSmsProvider()
    raise ValueError(f"Unsupported SMS provider: {name!r}")


_provider: SmsProvider | None = None


def get_sms_provider() -> SmsProvider:
    """Return the shared SMS provider."""
    global _provider
    if _provider is None:
        _provider = build_provider(get_settings().sms_provider)
    return _provider


def set_sms_provider(provider: SmsProvider | None) -> None:
    """Override the shared provider (``None`` restores the configured one)."""
    global _provider
    _provider = provider


def send_sms_safely(phone: str, text: str) -> None:
    """Send a message and swallow provider failures.

    A failing SMS must never break the request that triggered it.
    """
    try:
        get_sms_provider().send(phone, text)
    except Exception:
        # A failing SMS must never break the request that triggered it.
        logger.exception("Could not send the SMS to %s", mask_phone(phone))


def build_otp_message(code: str) -> str:
    """Return the Persian login message that carries the one time code."""
    return f"کد ورود شما به باشگاه جنتلمن‌ها: {code}"


def build_booking_created_message(code: str, day: str, time: str) -> str:
    """Return the Persian confirmation message of a new booking."""
    return f"نوبت شما در باشگاه جنتلمن‌ها ثبت شد. کد پیگیری: {code} — روز {day} ساعت {time}"


def build_booking_cancelled_message(code: str, day: str, time: str) -> str:
    """Return the Persian cancellation message of a booking."""
    return f"نوبت شما در باشگاه جنتلمن‌ها لغو شد. کد پیگیری: {code} — روز {day} ساعت {time}"
