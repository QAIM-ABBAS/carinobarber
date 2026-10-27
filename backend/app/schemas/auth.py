"""Schemas of customer authentication and the account area."""

from __future__ import annotations

from datetime import date as Date
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.core.phone import normalize_digits


class OtpRequest(BaseModel):
    """Body of a one time code request."""

    model_config = ConfigDict(extra="forbid")

    phone: str = Field(max_length=64, description="شماره موبایل")


class OtpRequestOut(BaseModel):
    """Answer of the OTP request endpoint."""

    expires_in: int = Field(description="مدت اعتبار کد به ثانیه")
    resend_after: int = Field(description="زمان انتظار برای ارسال مجدد به ثانیه")
    is_new_user: bool = Field(description="آیا این شماره قبلاً حساب داشته است؟")
    dev_code: str | None = Field(
        default=None,
        description="کد در حالت آزمایشی؛ در حالت واقعی همیشه null است",
    )


class OtpVerifyRequest(BaseModel):
    """Body of the code verification endpoint."""

    model_config = ConfigDict(extra="forbid")

    phone: str = Field(max_length=64, description="شماره موبایل")
    code: str = Field(min_length=1, max_length=50, description="کد شش رقمی")
    name: str | None = Field(default=None, description="نام مشتری جدید")

    @field_validator("code", mode="before")
    @classmethod
    def _normalize_code(cls, value: object) -> object:
        if isinstance(value, str):
            return normalize_digits(value.strip())
        return value


class CustomerOut(BaseModel):
    """A customer account."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    phone: str = Field(description="شماره موبایل نرمال‌شده")
    is_admin: bool = Field(
        default=False,
        description="آیا این شماره موبایل به پنل مدیریت دسترسی دارد؟",
    )
    created_at: datetime


class CustomerTokenOut(BaseModel):
    """The token returned after a successful verification."""

    access_token: str
    token_type: str = "bearer"
    expires_in: int = Field(description="مدت اعتبار توکن به ثانیه")
    user: CustomerOut


class CustomerUpdate(BaseModel):
    """Body of a profile update."""

    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=2, max_length=100, description="نام و نام خانوادگی")

    @field_validator("name", mode="before")
    @classmethod
    def _strip_name(cls, value: object) -> object:
        if isinstance(value, str):
            return value.strip()
        return value


class MyBookingServiceOut(BaseModel):
    """The service part of a customer booking."""

    id: str = Field(description="شناسه عمومی خدمت (slug)")
    label: str


class MyBookingOut(BaseModel):
    """A booking as shown in the customer account."""

    code: str
    status: str
    service: MyBookingServiceOut
    date: Date
    time: str
    name: str
    price_at_booking: int
    can_cancel: bool
    created_at: datetime


BookingScope = Literal["upcoming", "past", "all"]
