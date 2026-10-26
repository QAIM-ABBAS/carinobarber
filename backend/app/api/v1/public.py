"""Public HTTP routes (health, services, availability, bookings)."""

from __future__ import annotations

from datetime import date, datetime

from fastapi import APIRouter, BackgroundTasks, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_customer
from app.core.rate_limit import rate_limit_bookings
from app.core.timeutil import get_now
from app.db.session import get_db
from app.models.user import User
from app.schemas.availability import AvailabilityOut, DayAvailabilityOut
from app.schemas.booking import BookingCancel, BookingCreate, BookingOut
from app.schemas.common import ERROR_RESPONSES
from app.schemas.service import ServiceOut
from app.services.availability import get_availability
from app.services.bookings import cancel_booking, create_booking, get_booking
from app.services.catalog import list_active_services
from app.services.sms import (
    build_booking_cancelled_message,
    build_booking_created_message,
    send_sms_safely,
)

health_router = APIRouter(tags=["health"])
public_router = APIRouter(tags=["public"], responses={422: ERROR_RESPONSES[422]})


@health_router.get("/health", summary="بررسی سلامت سرویس")
def health() -> dict[str, str]:
    """Return a minimal payload proving the API is up."""
    return {"status": "ok"}


@public_router.get(
    "/services",
    response_model=list[ServiceOut],
    summary="فهرست خدمات فعال",
)
def list_services(db: Session = Depends(get_db)) -> list[ServiceOut]:
    """Return the active services ordered by their display order."""
    return [ServiceOut.model_validate(item) for item in list_active_services(db)]


@public_router.get(
    "/availability",
    response_model=AvailabilityOut,
    summary="ساعت‌های آزاد روزهای پیش رو",
)
def availability(
    db: Session = Depends(get_db),
    now: datetime = Depends(get_now),
    start: date | None = Query(
        default=None,
        description="اولین روز بازه (پیش‌فرض: امروز) به فرمت YYYY-MM-DD",
    ),
    days: int | None = Query(
        default=None,
        ge=1,
        le=31,
        description="تعداد روزها (پیش‌فرض: بازه رزرو تنظیم‌شده، حداکثر ۳۱ روز)",
    ),
) -> AvailabilityOut:
    """Return the slot availability of every day inside the booking window."""
    result = get_availability(session=db, now=now, start=start, days=days)
    return AvailabilityOut(days=[DayAvailabilityOut.model_validate(day) for day in result])


@public_router.post(
    "/bookings",
    response_model=BookingOut,
    status_code=201,
    summary="ثبت نوبت جدید",
    responses={201: {"description": "نوبت با موفقیت ثبت شد"}, **ERROR_RESPONSES},
)
def create_booking_endpoint(
    payload: BookingCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_customer),
    _rate_limit: None = Depends(rate_limit_bookings),
    now: datetime = Depends(get_now),
) -> BookingOut:
    """Book a slot for the logged in customer; the confirmation SMS is backgrounded."""
    booking = create_booking(
        session=db,
        service_id=payload.service_id,
        day=payload.date,
        time=payload.time,
        name=payload.name,
        phone=user.phone,
        now=now,
        user_id=user.id,
    )
    background_tasks.add_task(
        send_sms_safely,
        booking.phone,
        build_booking_created_message(booking.code, booking.date.isoformat(), booking.time),
    )
    return BookingOut.model_validate(booking)


@public_router.get(
    "/bookings/{code}",
    response_model=BookingOut,
    summary="مشاهده وضعیت نوبت",
    responses={404: ERROR_RESPONSES[404]},
)
def get_booking_endpoint(
    code: str,
    phone: str = Query(max_length=64, description="شماره موبایلی که نوبت با آن ثبت شده است"),
    db: Session = Depends(get_db),
) -> BookingOut:
    """Return a booking; the phone number must match the one of the booking."""
    return BookingOut.model_validate(get_booking(session=db, code=code, phone=phone))


@public_router.post(
    "/bookings/{code}/cancel",
    response_model=BookingOut,
    summary="لغو نوبت",
    responses={404: ERROR_RESPONSES[404], 409: ERROR_RESPONSES[409]},
)
def cancel_booking_endpoint(
    code: str,
    payload: BookingCancel,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    now: datetime = Depends(get_now),
) -> BookingOut:
    """Cancel a booking; the phone number must match the one of the booking."""
    booking = cancel_booking(session=db, code=code, phone=payload.phone, now=now)
    background_tasks.add_task(
        send_sms_safely,
        booking.phone,
        build_booking_cancelled_message(booking.code, booking.date.isoformat(), booking.time),
    )
    return BookingOut.model_validate(booking)
