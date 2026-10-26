"""Phone verification with one time codes. This module must not import FastAPI."""

from __future__ import annotations

import hashlib
import hmac
import math
import secrets
from dataclasses import dataclass
from datetime import datetime, timedelta

from sqlalchemy import delete, select, update
from sqlalchemy.orm import Session

from app.core.config import Settings, get_settings
from app.core.errors import AppError
from app.core.phone import InvalidPhoneError, normalize_phone
from app.core.timeutil import ensure_aware
from app.models.otp_code import OtpCode
from app.models.user import User
from app.services.accounts import link_bookings_to_user
from app.services.sms import build_otp_message, send_sms_safely

OTP_LENGTH = 6
OTP_MAX_ATTEMPTS = 5
OTP_RETENTION = timedelta(days=1)
OTP_RATE_WINDOW = timedelta(hours=1)
INVALID_PHONE_MESSAGE = "شماره موبایل معتبر نیست. نمونه درست: ۰۹۱۲۱۲۳۴۵۶۷"
RATE_LIMITED_MESSAGE = "دریافت کد بیش از حد مجاز است. لطفاً کمی بعد دوباره تلاش کنید."


@dataclass(frozen=True)
class OtpRequestResult:
    """Everything the OTP request endpoint returns."""

    expires_in: int
    resend_after: int
    is_new_user: bool
    dev_code: str | None


def generate_otp_code() -> str:
    """Return a random six digit code."""
    return f"{secrets.randbelow(10**OTP_LENGTH):0{OTP_LENGTH}d}"


def hash_otp_code(phone: str, code: str, secret_key: str | None = None) -> str:
    """Return the HMAC-SHA256 of ``phone:code`` keyed with ``SECRET_KEY``."""
    key = secret_key if secret_key is not None else get_settings().secret_key
    message = f"{phone}:{code}".encode()
    return hmac.new(key.encode(), message, hashlib.sha256).hexdigest()


def _normalize_phone(value: str) -> str:
    try:
        return normalize_phone(value)
    except InvalidPhoneError as exc:
        raise AppError(
            code="invalid_phone",
            message=INVALID_PHONE_MESSAGE,
            status_code=422,
        ) from exc


def _retry_after(deadline: datetime, now: datetime) -> int:
    return max(1, math.ceil((deadline - now).total_seconds()))


def _rate_limited(retry_after: int) -> AppError:
    return AppError(
        code="otp_rate_limited",
        message=RATE_LIMITED_MESSAGE,
        status_code=429,
        details={"retry_after": retry_after},
    )


def _cleanup_old_codes(session: Session, now: datetime) -> None:
    session.execute(delete(OtpCode).where(OtpCode.created_at < now - OTP_RETENTION))
    session.commit()


def _check_phone_limits(session: Session, phone: str, now: datetime, settings: Settings) -> None:
    latest = session.scalars(
        select(OtpCode)
        .where(OtpCode.phone == phone)
        .order_by(OtpCode.created_at.desc(), OtpCode.id.desc())
    ).first()
    if latest is not None:
        resend_at = ensure_aware(latest.created_at) + timedelta(seconds=settings.otp_resend_seconds)
        if now < resend_at:
            raise _rate_limited(_retry_after(resend_at, now))

    window_start = now - OTP_RATE_WINDOW
    recent = list(
        session.scalars(
            select(OtpCode)
            .where(OtpCode.phone == phone, OtpCode.created_at >= window_start)
            .order_by(OtpCode.created_at, OtpCode.id)
        ).all()
    )
    if len(recent) >= settings.otp_max_per_hour:
        oldest = ensure_aware(recent[0].created_at)
        raise _rate_limited(_retry_after(oldest + OTP_RATE_WINDOW, now))


def request_otp(
    session: Session,
    *,
    phone: str,
    now: datetime,
    ip: str | None,
    settings: Settings,
) -> OtpRequestResult:
    """Create a code, invalidate older codes and optionally deliver it by SMS.

    Raises:
        AppError: 422 ``invalid_phone`` or 429 ``otp_rate_limited``.
    """
    moment = ensure_aware(now)
    normalized_phone = _normalize_phone(phone)
    _cleanup_old_codes(session, moment)
    _check_phone_limits(session, normalized_phone, moment, settings)

    session.execute(
        update(OtpCode)
        .where(OtpCode.phone == normalized_phone, OtpCode.consumed_at.is_(None))
        .values(consumed_at=moment)
    )
    code = generate_otp_code()
    session.add(
        OtpCode(
            phone=normalized_phone,
            code_hash=hash_otp_code(normalized_phone, code, settings.secret_key),
            expires_at=moment + timedelta(seconds=settings.otp_ttl_seconds),
            attempts=0,
            ip=ip[:45] if ip else None,
            created_at=moment,
        )
    )
    session.commit()

    is_new_user = session.scalar(select(User.id).where(User.phone == normalized_phone)) is None
    if not settings.otp_dev_mode:
        send_sms_safely(normalized_phone, build_otp_message(code))

    return OtpRequestResult(
        expires_in=settings.otp_ttl_seconds,
        resend_after=settings.otp_resend_seconds,
        is_new_user=is_new_user,
        dev_code=code if settings.otp_dev_mode else None,
    )


def _latest_unconsumed(session: Session, phone: str) -> OtpCode | None:
    return session.scalars(
        select(OtpCode)
        .where(OtpCode.phone == phone, OtpCode.consumed_at.is_(None))
        .order_by(OtpCode.created_at.desc(), OtpCode.id.desc())
    ).first()


def _too_many_attempts() -> AppError:
    return AppError(
        code="otp_too_many_attempts",
        message="تعداد تلاش‌های نادرست بیش از حد مجاز است. لطفاً کد جدید بگیرید.",
        status_code=429,
        details={"attempts_left": 0},
    )


def verify_otp(
    session: Session,
    *,
    phone: str,
    code: str,
    name: str | None,
    now: datetime,
    settings: Settings,
) -> User:
    """Verify a code and create or login the customer.

    Raises:
        AppError: with ``otp_expired``, ``otp_invalid``, ``otp_too_many_attempts`` or
            ``name_required``.
    """
    moment = ensure_aware(now)
    normalized_phone = _normalize_phone(phone)
    _cleanup_old_codes(session, moment)

    otp = _latest_unconsumed(session, normalized_phone)
    if otp is None or ensure_aware(otp.expires_at) <= moment:
        raise AppError(
            code="otp_expired",
            message="کد وارد شده منقضی شده است. لطفاً کد جدید بگیرید.",
            status_code=400,
        )
    if otp.attempts >= OTP_MAX_ATTEMPTS:
        raise _too_many_attempts()

    expected = hash_otp_code(normalized_phone, code, settings.secret_key)
    if not hmac.compare_digest(otp.code_hash, expected):
        otp.attempts += 1
        session.commit()
        attempts_left = max(0, OTP_MAX_ATTEMPTS - otp.attempts)
        if attempts_left == 0:
            raise _too_many_attempts()
        raise AppError(
            code="otp_invalid",
            message="کد وارد شده نادرست است.",
            status_code=400,
            details={"attempts_left": attempts_left},
        )

    user = session.scalars(select(User).where(User.phone == normalized_phone)).first()
    if user is None:
        clean_name = (name or "").strip()
        if not 2 <= len(clean_name) <= 100:
            raise AppError(
                code="name_required",
                message="برای ساخت حساب، نام و نام خانوادگی را وارد کنید.",
                status_code=422,
            )
        user = User(phone=normalized_phone, name=clean_name, last_login_at=moment)
        session.add(user)
    else:
        user.last_login_at = moment

    otp.consumed_at = moment
    session.flush()
    link_bookings_to_user(session, user)
    session.commit()
    return user
