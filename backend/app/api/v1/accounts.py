"""Customer authentication, profile and account bookings routes."""

from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, BackgroundTasks, Depends, Query, Request
from sqlalchemy.orm import Session

from app.api.deps import get_current_customer
from app.core.config import Settings, get_settings
from app.core.rate_limit import rate_limit_otp_request
from app.core.security import create_customer_token, is_admin_phone
from app.core.timeutil import get_now
from app.db.session import get_db
from app.models.user import User
from app.schemas.auth import (
    BookingScope,
    CustomerOut,
    CustomerTokenOut,
    CustomerUpdate,
    MyBookingOut,
    MyBookingServiceOut,
    OtpRequest,
    OtpRequestOut,
    OtpVerifyRequest,
)
from app.schemas.common import ERROR_RESPONSES
from app.services.accounts import (
    CustomerBooking,
    cancel_customer_booking,
    list_customer_bookings,
)
from app.services.accounts import update_customer_name as update_name
from app.services.otp import request_otp, verify_otp
from app.services.sms import build_booking_cancelled_message, send_sms_safely

accounts_router = APIRouter(tags=["accounts"])


def _settings(request: Request) -> Settings:
    return getattr(request.app.state, "settings", None) or get_settings()


def _customer_out(user: User, settings: Settings) -> CustomerOut:
    """Build the profile answer, including the admin access of the phone."""
    return CustomerOut(
        id=user.id,
        name=user.name,
        phone=user.phone,
        is_admin=is_admin_phone(user.phone, settings),
        created_at=user.created_at,
    )


def _booking_out(item: CustomerBooking) -> MyBookingOut:
    return MyBookingOut(
        code=item.code,
        status=item.status,
        service=MyBookingServiceOut(id=item.service.id, label=item.service.label),
        date=item.date,
        time=item.time,
        name=item.name,
        price_at_booking=item.price_at_booking,
        can_cancel=item.can_cancel,
        created_at=item.created_at,
    )


@accounts_router.post(
    "/auth/otp/request",
    response_model=OtpRequestOut,
    summary="درخواست کد ورود",
    responses={422: ERROR_RESPONSES[422], 429: ERROR_RESPONSES[429]},
)
def request_otp_endpoint(
    payload: OtpRequest,
    request: Request,
    _rate_limit: None = Depends(rate_limit_otp_request),
    db: Session = Depends(get_db),
    now: datetime = Depends(get_now),
) -> OtpRequestOut:
    """Send a login code to a customer phone number."""
    result = request_otp(
        session=db,
        phone=payload.phone,
        now=now,
        ip=request.client.host if request.client is not None else None,
        settings=_settings(request),
    )
    return OtpRequestOut(
        expires_in=result.expires_in,
        resend_after=result.resend_after,
        is_new_user=result.is_new_user,
        dev_code=result.dev_code,
    )


@accounts_router.post(
    "/auth/otp/verify",
    response_model=CustomerTokenOut,
    summary="تأیید کد ورود",
    responses={
        400: ERROR_RESPONSES[400],
        422: ERROR_RESPONSES[422],
        429: ERROR_RESPONSES[429],
    },
)
def verify_otp_endpoint(
    payload: OtpVerifyRequest,
    request: Request,
    db: Session = Depends(get_db),
    now: datetime = Depends(get_now),
) -> CustomerTokenOut:
    """Verify the code, create/login the customer and return a customer token."""
    settings = _settings(request)
    user = verify_otp(
        session=db,
        phone=payload.phone,
        code=payload.code,
        name=payload.name,
        now=now,
        settings=settings,
    )
    token, expires_in = create_customer_token(
        user.id,
        expires_days=settings.customer_token_expire_days,
    )
    return CustomerTokenOut(
        access_token=token,
        expires_in=expires_in,
        user=_customer_out(user, settings),
    )


@accounts_router.get(
    "/me",
    response_model=CustomerOut,
    summary="پروفایل من",
    responses={401: ERROR_RESPONSES[401]},
)
def get_me(
    request: Request,
    user: User = Depends(get_current_customer),
) -> CustomerOut:
    """Return the profile of the logged in customer."""
    return _customer_out(user, _settings(request))


@accounts_router.patch(
    "/me",
    response_model=CustomerOut,
    summary="ویرایش پروفایل من",
    responses={401: ERROR_RESPONSES[401], 422: ERROR_RESPONSES[422]},
)
def update_me(
    payload: CustomerUpdate,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_customer),
) -> CustomerOut:
    """Update the display name of the logged in customer."""
    updated = update_name(db, user, payload.name)
    return _customer_out(updated, _settings(request))


@accounts_router.get(
    "/me/bookings",
    response_model=list[MyBookingOut],
    summary="نوبت‌های من",
    responses={401: ERROR_RESPONSES[401], 422: ERROR_RESPONSES[422]},
)
def get_my_bookings(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_customer),
    now: datetime = Depends(get_now),
    scope: BookingScope = Query(default="all", description="upcoming | past | all"),
) -> list[MyBookingOut]:
    """Return the bookings of the customer, filtered by scope."""
    items = list_customer_bookings(session=db, user=user, scope=scope, now=now)
    return [_booking_out(item) for item in items]


@accounts_router.post(
    "/me/bookings/{code}/cancel",
    response_model=MyBookingOut,
    summary="لغو نوبت من",
    responses={
        401: ERROR_RESPONSES[401],
        404: ERROR_RESPONSES[404],
        409: ERROR_RESPONSES[409],
    },
)
def cancel_my_booking(
    code: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_customer),
    now: datetime = Depends(get_now),
) -> MyBookingOut:
    """Cancel one of the customer's bookings and send the cancellation SMS."""
    item = cancel_customer_booking(session=db, user=user, code=code, now=now)
    background_tasks.add_task(
        send_sms_safely,
        user.phone,
        build_booking_cancelled_message(code, item.date.isoformat(), item.time),
    )
    return _booking_out(item)
