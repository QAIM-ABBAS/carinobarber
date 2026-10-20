"""Business logic of the admin API. This module must not import FastAPI."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.core.errors import AppError
from app.models.booking import ACTIVE_STATUSES, Booking, BookingStatus
from app.models.closed_date import ClosedDate
from app.models.service import Service
from app.schemas.admin import (
    AdminBookingServiceOut,
    AdminBookingUpdate,
    ClosedDateCreate,
    ServiceCreate,
    ServiceUpdate,
    ShopSettingsUpdate,
    StatsSummary,
)
from app.services.availability import get_shop_settings

ALLOWED_TRANSITIONS: dict[str, set[str]] = {
    BookingStatus.PENDING.value: {
        BookingStatus.CONFIRMED.value,
        BookingStatus.CANCELLED.value,
        BookingStatus.NO_SHOW.value,
    },
    BookingStatus.CONFIRMED.value: {
        BookingStatus.COMPLETED.value,
        BookingStatus.CANCELLED.value,
        BookingStatus.NO_SHOW.value,
    },
}


@dataclass(frozen=True)
class BookingFilters:
    """Filters of the admin booking list."""

    date: date | None = None
    date_from: date | None = None
    date_to: date | None = None
    status: str | None = None
    q: str | None = None


def list_services(session: Session) -> list[Service]:
    """Return every service, including the inactive ones."""
    return list(session.scalars(select(Service).order_by(Service.sort_order, Service.id)).all())


def get_service(session: Session, service_id: int) -> Service:
    """Return a service by its numeric id.

    Raises:
        AppError: 404 ``service_not_found`` when the service does not exist.
    """
    service = session.get(Service, service_id)
    if service is None:
        raise AppError(
            code="service_not_found",
            message="خدمت مورد نظر یافت نشد.",
            status_code=404,
        )
    return service


def create_service(session: Session, payload: ServiceCreate) -> Service:
    """Create a new service.

    Raises:
        AppError: 409 ``already_exists`` when the slug is already taken.
    """
    existing = session.scalars(select(Service).where(Service.slug == payload.slug)).first()
    if existing is not None:
        raise AppError(
            code="already_exists",
            message="خدمتی با این شناسه از قبل وجود دارد.",
            status_code=409,
        )
    service = Service(**payload.model_dump())
    session.add(service)
    session.commit()
    return service


def update_service(session: Session, service_id: int, payload: ServiceUpdate) -> Service:
    """Apply a partial update on a service. The slug stays immutable."""
    service = get_service(session, service_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(service, field, value)
    session.commit()
    return service


def deactivate_service(session: Session, service_id: int) -> Service:
    """Soft delete a service by deactivating it."""
    service = get_service(session, service_id)
    service.is_active = False
    session.commit()
    return service


def _apply_filters(statement, filters: BookingFilters):
    if filters.date is not None:
        statement = statement.where(Booking.date == filters.date)
    if filters.date_from is not None:
        statement = statement.where(Booking.date >= filters.date_from)
    if filters.date_to is not None:
        statement = statement.where(Booking.date <= filters.date_to)
    if filters.status:
        statement = statement.where(Booking.status == filters.status)
    if filters.q:
        pattern = f"%{filters.q.strip()}%"
        statement = statement.where(
            or_(
                Booking.customer_name.ilike(pattern),
                Booking.phone.ilike(pattern),
                Booking.code.ilike(pattern),
            )
        )
    return statement


def list_bookings(
    session: Session,
    filters: BookingFilters,
    page: int,
    page_size: int,
) -> tuple[list[Booking], int]:
    """Return a page of bookings and the total number of matching rows."""
    statement = _apply_filters(select(Booking), filters)
    total = session.scalar(select(func.count()).select_from(statement.subquery())) or 0

    statement = statement.order_by(Booking.date, Booking.time, Booking.id)
    statement = statement.offset((page - 1) * page_size).limit(page_size)
    bookings = list(session.scalars(statement).all())
    return bookings, total


def to_booking_item(booking: Booking) -> dict[str, object]:
    """Map a booking to the payload of the admin list."""
    return {
        "id": booking.id,
        "code": booking.code,
        "status": booking.status,
        "service": AdminBookingServiceOut(id=booking.service.slug, label=booking.service.label),
        "date": booking.date,
        "time": booking.time,
        "name": booking.customer_name,
        "phone": booking.phone,
        "price_at_booking": booking.price_at_booking,
        "admin_note": booking.admin_note,
        "created_at": booking.created_at,
    }


def update_booking(session: Session, booking_id: int, payload: AdminBookingUpdate) -> Booking:
    """Update the status and/or the admin note of a booking.

    Raises:
        AppError: 404 ``booking_not_found`` when the booking does not exist and
            409 ``invalid_status_transition`` when the transition is not allowed.
    """
    booking = session.get(Booking, booking_id)
    if booking is None:
        raise AppError(
            code="booking_not_found",
            message="نوبت مورد نظر یافت نشد.",
            status_code=404,
        )

    if payload.status is not None:
        allowed = ALLOWED_TRANSITIONS.get(booking.status, set())
        if payload.status.value not in allowed:
            raise AppError(
                code="invalid_status_transition",
                message="این تغییر وضعیت مجاز نیست.",
                status_code=409,
            )
        booking.status = payload.status.value

    if "admin_note" in payload.model_fields_set:
        booking.admin_note = payload.admin_note

    session.commit()
    return booking


def update_shop_settings(session: Session, payload: ShopSettingsUpdate) -> object:
    """Apply a settings update and validate the result.

    Raises:
        AppError: 422 ``invalid_settings`` when the resulting settings are not valid.
    """
    settings = get_shop_settings(session)
    values = payload.model_dump(exclude_unset=True)

    open_hour = values.get("open_hour", settings.open_hour)
    close_hour = values.get("close_hour", settings.close_hour)
    if not 0 <= open_hour < close_hour <= 24:
        raise AppError(
            code="invalid_settings",
            message="ساعت کاری معتبر نیست؛ ساعت شروع باید کوچک‌تر از ساعت پایان باشد.",
            status_code=422,
        )

    for field, value in values.items():
        setattr(settings, field, value)
    session.commit()
    return settings


def list_closed_dates(session: Session) -> list[ClosedDate]:
    """Return every holiday ordered by date."""
    return list(session.scalars(select(ClosedDate).order_by(ClosedDate.date)).all())


def create_closed_date(session: Session, payload: ClosedDateCreate) -> ClosedDate:
    """Add a holiday.

    Raises:
        AppError: 409 ``already_exists`` when the date is already a holiday.
    """
    existing = session.scalars(select(ClosedDate).where(ClosedDate.date == payload.date)).first()
    if existing is not None:
        raise AppError(
            code="already_exists",
            message="این تاریخ قبلاً به تعطیلات اضافه شده است.",
            status_code=409,
        )
    closed_date = ClosedDate(date=payload.date, reason=payload.reason)
    session.add(closed_date)
    session.commit()
    return closed_date


def delete_closed_date(session: Session, closed_date_id: int) -> None:
    """Remove a holiday.

    Raises:
        AppError: 404 ``closed_date_not_found`` when the holiday does not exist.
    """
    closed_date = session.get(ClosedDate, closed_date_id)
    if closed_date is None:
        raise AppError(
            code="closed_date_not_found",
            message="تعطیلی مورد نظر یافت نشد.",
            status_code=404,
        )
    session.delete(closed_date)
    session.commit()


def get_stats_summary(session: Session, now: datetime) -> StatsSummary:
    """Return the numbers of the dashboard."""
    today = now.date()
    month_start = today.replace(day=1)
    if month_start.month == 12:
        next_month = month_start.replace(year=month_start.year + 1, month=1)
    else:
        next_month = month_start.replace(month=month_start.month + 1)

    today_bookings = (
        session.scalar(
            select(func.count())
            .select_from(Booking)
            .where(
                Booking.date == today,
                Booking.status != BookingStatus.CANCELLED.value,
            )
        )
        or 0
    )
    upcoming_bookings = (
        session.scalar(
            select(func.count())
            .select_from(Booking)
            .where(
                Booking.date > today,
                Booking.status.in_(ACTIVE_STATUSES),
            )
        )
        or 0
    )
    revenue = (
        session.scalar(
            select(func.coalesce(func.sum(Booking.price_at_booking), 0))
            .select_from(Booking)
            .where(
                Booking.status == BookingStatus.COMPLETED.value,
                Booking.date >= month_start,
                Booking.date < next_month,
            )
        )
        or 0
    )
    return StatsSummary(
        today_bookings=today_bookings,
        upcoming_bookings=upcoming_bookings,
        revenue_completed_this_month=int(revenue),
    )
