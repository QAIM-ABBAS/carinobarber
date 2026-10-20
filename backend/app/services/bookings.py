"""Booking business logic. This module must not import FastAPI."""

from __future__ import annotations

import secrets
import string
from dataclasses import dataclass
from datetime import date, datetime, timedelta

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.errors import AppError
from app.core.phone import InvalidPhoneError, normalize_phone
from app.core.timeutil import booking_window_bounds, ensure_aware, get_shop_timezone, slot_datetime
from app.models.booking import ACTIVE_STATUSES, Booking, BookingStatus
from app.models.service import Service
from app.services.availability import (
    generate_slot_times,
    get_closed_dates,
    get_shop_settings,
    is_weekday_closed,
)

CODE_LENGTH = 6
MAX_CODE_ATTEMPTS = 5


@dataclass(frozen=True)
class BookingServiceInfo:
    """The service part of a booking payload."""

    id: str
    label: str
    price: int


@dataclass(frozen=True)
class BookingResult:
    """Everything the API exposes about a booking."""

    code: str
    status: str
    service: BookingServiceInfo
    date: date
    time: str
    name: str
    phone: str


def generate_booking_code() -> str:
    """Return a random six digit booking code."""
    return "".join(secrets.choice(string.digits) for _ in range(CODE_LENGTH))


def _to_result(booking: Booking) -> BookingResult:
    return BookingResult(
        code=booking.code,
        status=booking.status,
        service=BookingServiceInfo(
            id=booking.service.slug,
            label=booking.service.label,
            price=booking.price_at_booking,
        ),
        date=booking.date,
        time=booking.time,
        name=booking.customer_name,
        phone=booking.phone,
    )


def _find_service(session: Session, slug: str) -> Service:
    """Return the active service with the given slug.

    Raises:
        AppError: 404 ``service_not_found`` when the service is unknown or inactive.
    """
    service = session.scalars(select(Service).where(Service.slug == slug)).first()
    if service is None or not service.is_active:
        raise AppError(
            code="service_not_found",
            message="خدمت مورد نظر یافت نشد.",
            status_code=404,
        )
    return service


def _normalize_phone(phone: str) -> str:
    """Normalize a phone number.

    Raises:
        AppError: 422 ``invalid_phone`` when the number cannot be normalized.
    """
    try:
        return normalize_phone(phone)
    except InvalidPhoneError as exc:
        raise AppError(
            code="invalid_phone",
            message="شماره موبایل معتبر نیست. نمونه درست: ۰۹۱۲۱۲۳۴۵۶۷",
            status_code=422,
        ) from exc


def _count_active_bookings(session: Session, phone: str, today: date) -> int:
    """Count the pending/confirmed bookings of a phone number from today on."""
    return (
        session.scalar(
            select(func.count())
            .select_from(Booking)
            .where(
                Booking.phone == phone,
                Booking.status.in_(ACTIVE_STATUSES),
                Booking.date >= today,
            )
        )
        or 0
    )


def _insert_booking(session: Session, booking: Booking) -> None:
    """Insert the booking, retrying on a code collision.

    Raises:
        AppError: 409 ``slot_taken`` when the slot is already booked.
    """
    for attempt in range(MAX_CODE_ATTEMPTS):
        try:
            session.add(booking)
            session.commit()
            return
        except IntegrityError as exc:
            session.rollback()
            if "uq_bookings_code" in str(exc.orig) and attempt < MAX_CODE_ATTEMPTS - 1:
                booking.code = generate_booking_code()
                continue
            raise AppError(
                code="slot_taken",
                message="این ساعت قبلاً رزرو شده است.",
                status_code=409,
            ) from exc


def create_booking(
    session: Session,
    *,
    service_id: str,
    day: date,
    time: str,
    name: str,
    phone: str,
    now: datetime,
) -> BookingResult:
    """Create a booking after running every validation in order.

    Args:
        session: database session.
        service_id: slug of the wanted service.
        day: shop local date of the appointment.
        time: wanted slot (``HH:00``).
        name: customer name.
        phone: customer phone number (any accepted format).
        now: current moment (shop timezone).

    Returns:
        The created booking.

    Raises:
        AppError: with the documented code for every failed validation.
    """
    moment = ensure_aware(now).astimezone(get_shop_timezone())
    normalized_phone = _normalize_phone(phone)
    customer_name = name.strip()

    service = _find_service(session, service_id)

    settings = get_shop_settings(session)
    today = moment.date()
    window_start, window_end = booking_window_bounds(today, settings.booking_window_days)
    if day < window_start or day > window_end:
        raise AppError(
            code="date_out_of_range",
            message="تاریخ انتخابی خارج از بازه مجاز رزرو است.",
            status_code=422,
        )

    if is_weekday_closed(day, settings) or day in get_closed_dates(session, day, day):
        raise AppError(
            code="day_closed",
            message="باشگاه در این روز تعطیل است.",
            status_code=409,
        )

    if time not in generate_slot_times(settings):
        raise AppError(
            code="invalid_time",
            message="ساعت انتخابی معتبر نیست.",
            status_code=422,
        )

    if slot_datetime(day, int(time[:2])) <= moment:
        raise AppError(
            code="slot_in_past",
            message="این ساعت گذشته است. لطفاً ساعت دیگری انتخاب کنید.",
            status_code=409,
        )

    if _count_active_bookings(session, normalized_phone, today) >= (
        settings.max_active_bookings_per_phone
    ):
        raise AppError(
            code="too_many_active_bookings",
            message="تعداد نوبت‌های فعال شما بیش از حد مجاز است.",
            status_code=409,
        )

    booking = Booking(
        code=generate_booking_code(),
        service_id=service.id,
        date=day,
        time=time,
        customer_name=customer_name,
        phone=normalized_phone,
        status=BookingStatus.PENDING.value,
        price_at_booking=service.price,
    )
    _insert_booking(session, booking)
    return _to_result(booking)


def _find_booking_by_code_and_phone(session: Session, code: str, phone: str) -> Booking | None:
    """Return the booking when the code and the phone number match."""
    try:
        normalized_phone = normalize_phone(phone)
    except InvalidPhoneError:
        return None
    return session.scalars(
        select(Booking).where(Booking.code == code, Booking.phone == normalized_phone)
    ).first()


def get_booking(session: Session, code: str, phone: str) -> BookingResult:
    """Return a booking for the given code and phone number.

    Raises:
        AppError: 404 ``booking_not_found`` when the code or the phone does not match.
    """
    booking = _find_booking_by_code_and_phone(session, code, phone)
    if booking is None:
        raise AppError(
            code="booking_not_found",
            message="نوبت مورد نظر یافت نشد.",
            status_code=404,
        )
    return _to_result(booking)


def cancel_booking(
    session: Session,
    code: str,
    phone: str,
    now: datetime,
) -> BookingResult:
    """Cancel a booking.

    Raises:
        AppError: 404 ``booking_not_found`` when the code or the phone does not match and
            409 ``cancel_not_allowed`` when the booking can no longer be cancelled.
    """
    moment = ensure_aware(now).astimezone(get_shop_timezone())
    booking = _find_booking_by_code_and_phone(session, code, phone)
    if booking is None:
        raise AppError(
            code="booking_not_found",
            message="نوبت مورد نظر یافت نشد.",
            status_code=404,
        )

    settings = get_shop_settings(session)
    cancellable = (BookingStatus.PENDING.value, BookingStatus.CONFIRMED.value)
    if booking.status not in cancellable:
        raise AppError(
            code="cancel_not_allowed",
            message="این نوبت قابل لغو نیست.",
            status_code=409,
        )

    starts_at = slot_datetime(booking.date, int(booking.time[:2]))
    if starts_at - moment < timedelta(hours=settings.cancel_before_hours):
        raise AppError(
            code="cancel_not_allowed",
            message="امکان لغو این نوبت وجود ندارد.",
            status_code=409,
        )

    booking.status = BookingStatus.CANCELLED.value
    session.commit()
    return _to_result(booking)
