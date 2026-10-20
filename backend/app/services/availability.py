"""Business logic for the availability calculation. This module must not import FastAPI."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.errors import AppError
from app.core.timeutil import booking_window_bounds, ensure_aware, get_shop_timezone
from app.models.booking import Booking, BookingStatus
from app.models.closed_date import ClosedDate
from app.models.shop_settings import SETTINGS_ROW_ID, ShopSettings


@dataclass(frozen=True)
class SlotAvailability:
    """A single slot of a day and whether it can be booked."""

    time: str
    available: bool


@dataclass(frozen=True)
class DayAvailability:
    """Availability information of one day."""

    date: date
    closed: bool
    available: bool
    slots: list[SlotAvailability]


def get_shop_settings(session: Session) -> ShopSettings:
    """Return the single shop settings row.

    Raises:
        AppError: when the settings row is missing (the database was not seeded).
    """
    settings = session.get(ShopSettings, SETTINGS_ROW_ID)
    if settings is None:
        raise AppError(
            code="settings_not_found",
            message="تنظیمات باشگاه یافت نشد.",
            status_code=500,
        )
    return settings


def generate_slot_times(settings: ShopSettings) -> list[str]:
    """Return the hourly slots of a day (``open_hour`` up to ``close_hour - 1``)."""
    return [f"{hour:02d}:00" for hour in range(settings.open_hour, settings.close_hour)]


def is_weekday_closed(day: date, settings: ShopSettings) -> bool:
    """Return True when the given day is a recurring closed weekday."""
    return day.weekday() in (settings.closed_weekdays or [])


def get_closed_dates(session: Session, start: date, end: date) -> set[date]:
    """Return the holiday dates inside the given range."""
    rows = session.scalars(
        select(ClosedDate.date).where(ClosedDate.date >= start, ClosedDate.date <= end)
    ).all()
    return set(rows)


def get_booked_slots(session: Session, start: date, end: date) -> set[tuple[date, str]]:
    """Return the ``(date, time)`` pairs that hold a non cancelled booking."""
    rows = session.execute(
        select(Booking.date, Booking.time).where(
            Booking.date >= start,
            Booking.date <= end,
            Booking.status != BookingStatus.CANCELLED.value,
        )
    ).all()
    return {(row[0], row[1]) for row in rows}


def is_slot_available(
    day: date,
    slot_time: str,
    today: date,
    current_hour: int,
    closed: bool,
    booked_slots: set[tuple[date, str]],
) -> bool:
    """Return True when a slot can still be booked.

    A slot is unavailable when the day is closed, when it already passed (only today
    can pass) or when a non cancelled booking exists for it.
    """
    if closed or day < today:
        return False
    if day == today and int(slot_time[:2]) <= current_hour:
        return False
    return (day, slot_time) not in booked_slots


def get_availability(
    session: Session,
    now: datetime,
    start: date | None = None,
    days: int | None = None,
) -> list[DayAvailability]:
    """Build the availability of a range of days.

    Args:
        session: database session.
        now: current moment (shop timezone); the caller injects it.
        start: first day of the range; defaults to today.
        days: number of days to return; defaults to the configured booking window.

    Returns:
        One entry per day, ordered by date.

    Raises:
        AppError: 422 ``date_out_of_range`` when ``start`` is outside the booking window.
    """
    moment = ensure_aware(now).astimezone(get_shop_timezone())
    today = moment.date()
    settings = get_shop_settings(session)
    window_start, window_end = booking_window_bounds(today, settings.booking_window_days)

    first_day = start or today
    if first_day < window_start or first_day > window_end:
        raise AppError(
            code="date_out_of_range",
            message="تاریخ انتخابی خارج از بازه مجاز رزرو است.",
            status_code=422,
        )

    day_count = days if days is not None else settings.booking_window_days
    last_day = min(first_day + timedelta(days=day_count - 1), window_end)

    slot_times = generate_slot_times(settings)
    closed_dates = get_closed_dates(session, first_day, last_day)
    booked_slots = get_booked_slots(session, first_day, last_day)

    availability: list[DayAvailability] = []
    for offset in range((last_day - first_day).days + 1):
        day = first_day + timedelta(days=offset)
        closed = is_weekday_closed(day, settings) or day in closed_dates
        slots: list[SlotAvailability] = []
        for slot_time in slot_times:
            available = is_slot_available(
                day=day,
                slot_time=slot_time,
                today=today,
                current_hour=moment.hour,
                closed=closed,
                booked_slots=booked_slots,
            )
            slots.append(SlotAvailability(time=slot_time, available=available))
        availability.append(
            DayAvailability(
                date=day,
                closed=closed,
                available=any(slot.available for slot in slots),
                slots=slots,
            )
        )
    return availability
