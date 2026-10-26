"""Customer account queries and booking ownership. No FastAPI imports."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime
from typing import Literal

from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.core.errors import AppError
from app.core.timeutil import ensure_aware, get_shop_timezone, slot_datetime
from app.models.booking import ACTIVE_STATUSES, Booking
from app.models.user import User
from app.services.availability import get_shop_settings
from app.services.bookings import cancel_booking, is_cancellable

BookingScope = Literal["upcoming", "past", "all"]


@dataclass(frozen=True)
class CustomerBookingService:
    """Service summary of a customer booking."""

    id: str
    label: str


@dataclass(frozen=True)
class CustomerBooking:
    """A booking in the shape the account area needs."""

    code: str
    status: str
    service: CustomerBookingService
    date: date
    time: str
    name: str
    price_at_booking: int
    can_cancel: bool
    created_at: datetime


def link_bookings_to_user(session: Session, user: User) -> int:
    """Attach every unowned booking of the user's phone to the account.

    Returns:
        The number of linked bookings.
    """
    result = session.execute(
        update(Booking)
        .where(Booking.phone == user.phone, Booking.user_id.is_(None))
        .values(user_id=user.id)
        .execution_options(synchronize_session=False)
    )
    return int(result.rowcount or 0)


def update_customer_name(session: Session, user: User, name: str) -> User:
    """Persist the new display name of a customer."""
    user.name = name
    session.commit()
    return user


def _to_customer_booking(
    booking: Booking,
    now: datetime,
    cancel_before_hours: int,
) -> CustomerBooking:
    return CustomerBooking(
        code=booking.code,
        status=booking.status,
        service=CustomerBookingService(
            id=booking.service.slug,
            label=booking.service.label,
        ),
        date=booking.date,
        time=booking.time,
        name=booking.customer_name,
        price_at_booking=booking.price_at_booking,
        can_cancel=is_cancellable(booking, now, cancel_before_hours),
        created_at=booking.created_at,
    )


def _is_upcoming(booking: Booking, now: datetime) -> bool:
    if booking.status not in ACTIVE_STATUSES:
        return False
    starts_at = slot_datetime(booking.date, int(booking.time[:2]))
    return starts_at > ensure_aware(now).astimezone(get_shop_timezone())


def list_customer_bookings(
    session: Session,
    user: User,
    scope: BookingScope,
    now: datetime,
) -> list[CustomerBooking]:
    """Return the bookings of a customer filtered by the requested scope."""
    bookings = list(
        session.scalars(
            select(Booking).where(Booking.user_id == user.id).order_by(Booking.id)
        ).all()
    )
    settings = get_shop_settings(session)
    upcoming = [booking for booking in bookings if _is_upcoming(booking, now)]
    past = [booking for booking in bookings if not _is_upcoming(booking, now)]

    if scope == "upcoming":
        selected = upcoming
        selected.sort(key=lambda item: (item.date, item.time, item.id))
    elif scope == "past":
        selected = past
        selected.sort(key=lambda item: (item.date, item.time, item.id), reverse=True)
    else:
        selected = bookings
        selected.sort(key=lambda item: (item.date, item.time, item.id), reverse=True)

    return [_to_customer_booking(item, now, settings.cancel_before_hours) for item in selected]


def _get_owned_booking(session: Session, user: User, code: str) -> Booking:
    booking = session.scalars(
        select(Booking).where(Booking.code == code, Booking.user_id == user.id)
    ).first()
    if booking is None:
        raise AppError(
            code="booking_not_found",
            message="نوبت مورد نظر یافت نشد.",
            status_code=404,
        )
    return booking


def cancel_customer_booking(
    session: Session,
    user: User,
    code: str,
    now: datetime,
) -> CustomerBooking:
    """Cancel a booking after checking that it belongs to the customer."""
    booking = _get_owned_booking(session, user, code)
    cancel_booking(session=session, code=code, phone=user.phone, now=now)
    settings = get_shop_settings(session)
    return _to_customer_booking(booking, now, settings.cancel_before_hours)
