"""Time helpers. Business logic must never call ``datetime.now()`` directly."""

from __future__ import annotations

from datetime import UTC, date, datetime, time, timedelta
from zoneinfo import ZoneInfo

from app.core.config import get_settings


def get_shop_timezone() -> ZoneInfo:
    """Return the timezone the shop operates in (``Asia/Tehran`` by default)."""
    return get_settings().shop_tz


def ensure_aware(moment: datetime) -> datetime:
    """Treat naive datetimes as UTC so the code never mixes aware and naive values."""
    if moment.tzinfo is None:
        return moment.replace(tzinfo=UTC)
    return moment


def get_now() -> datetime:
    """Return the current moment in the shop timezone.

    This is the single place where the wall clock is read. Tests override this
    dependency to get a deterministic "now".
    """
    return datetime.now(get_shop_timezone())


def to_shop_date(moment: datetime) -> date:
    """Return the shop local calendar date of the given moment."""
    return moment.astimezone(get_shop_timezone()).date()


def slot_datetime(day: date, hour: int, minute: int = 0) -> datetime:
    """Build the timezone aware datetime of a slot on a shop local day."""
    return datetime.combine(day, time(hour=hour, minute=minute), tzinfo=get_shop_timezone())


def booking_window_bounds(today: date, window_days: int) -> tuple[date, date]:
    """Return the first and last bookable day for the given window size."""
    if window_days < 1:
        raise ValueError("window_days must be at least 1")
    return today, today + timedelta(days=window_days - 1)
