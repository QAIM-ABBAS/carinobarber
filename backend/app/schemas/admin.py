"""Schemas of the admin API."""

from __future__ import annotations

from datetime import date as Date
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.booking import BookingStatus

SLUG_PATTERN = r"^[a-z0-9-]{2,50}$"


class AdminLogin(BaseModel):
    """Body of the admin login request."""

    model_config = ConfigDict(extra="forbid")

    username: str = Field(min_length=1, max_length=100)
    password: str = Field(min_length=1, max_length=200)


class TokenOut(BaseModel):
    """The access token returned by the login endpoint."""

    access_token: str
    token_type: str = "bearer"
    expires_in: int = Field(description="Lifetime of the token in seconds")


class ServiceAdminOut(BaseModel):
    """A service as seen by the admin (including the inactive ones)."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    slug: str
    label: str
    description: str
    price: int
    duration_minutes: int
    includes: list[str]
    featured: bool
    is_active: bool
    sort_order: int
    created_at: datetime
    updated_at: datetime


class ServiceCreate(BaseModel):
    """Body of a service creation request."""

    model_config = ConfigDict(extra="forbid")

    slug: str = Field(pattern=SLUG_PATTERN, description="شناسهٔ دائمی خدمت")
    label: str = Field(min_length=1, max_length=100)
    description: str = Field(min_length=1, max_length=2000)
    price: int = Field(ge=0, description="قیمت به تومان")
    duration_minutes: int = Field(gt=0, le=600)
    includes: list[str] = Field(default_factory=list, max_length=30)
    featured: bool = False
    is_active: bool = True
    sort_order: int = Field(default=0, ge=0, le=10_000)


class ServiceUpdate(BaseModel):
    """Body of a partial service update. The slug is immutable."""

    model_config = ConfigDict(extra="forbid")

    label: str | None = Field(default=None, min_length=1, max_length=100)
    description: str | None = Field(default=None, min_length=1, max_length=2000)
    price: int | None = Field(default=None, ge=0)
    duration_minutes: int | None = Field(default=None, gt=0, le=600)
    includes: list[str] | None = Field(default=None, max_length=30)
    featured: bool | None = None
    is_active: bool | None = None
    sort_order: int | None = Field(default=None, ge=0, le=10_000)


class AdminBookingServiceOut(BaseModel):
    """The service of a booking, as shown in the admin list."""

    model_config = ConfigDict(from_attributes=True)

    id: str = Field(description="شناسهٔ عمومی خدمت (slug)")
    label: str


class AdminBookingItem(BaseModel):
    """A booking as shown in the admin list."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    code: str
    status: str
    service: AdminBookingServiceOut
    date: Date
    time: str
    name: str
    phone: str
    price_at_booking: int
    admin_note: str | None = None
    created_at: datetime


class AdminBookingList(BaseModel):
    """A page of bookings."""

    items: list[AdminBookingItem]
    total: int
    page: int
    page_size: int


class AdminBookingCreate(BaseModel):
    """Body of a booking the admin creates by hand (phone booking / walk-in)."""

    model_config = ConfigDict(extra="forbid")

    service_id: str = Field(min_length=1, max_length=50, description="شناسهٔ عمومی خدمت (slug)")
    date: Date = Field(description="تاریخ نوبت به فرمت YYYY-MM-DD")
    time: str = Field(min_length=1, max_length=10, description="ساعت نوبت به فرمت HH:mm")
    name: str = Field(min_length=2, max_length=100, description="نام و نام خانوادگی")
    phone: str = Field(max_length=64, description="شماره موبایل")
    status: Literal["pending", "confirmed"] = Field(
        default="confirmed", description="وضعیت اولیهٔ نوبت"
    )
    admin_note: str | None = Field(default=None, max_length=2000)

    @field_validator("name", mode="before")
    @classmethod
    def _strip_name(cls, value: object) -> object:
        if isinstance(value, str):
            return value.strip()
        return value


class AdminBookingUpdate(BaseModel):
    """Body of a booking update (status and/or admin note)."""

    model_config = ConfigDict(extra="forbid")

    status: BookingStatus | None = None
    admin_note: str | None = Field(default=None, max_length=2000)


class ShopSettingsOut(BaseModel):
    """The shop settings."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    open_hour: int
    close_hour: int
    closed_weekdays: list[int]
    booking_window_days: int
    cancel_before_hours: int
    max_active_bookings_per_phone: int
    updated_at: datetime


class ShopSettingsUpdate(BaseModel):
    """Body of a shop settings update. Missing fields keep their current value."""

    model_config = ConfigDict(extra="forbid")

    open_hour: int | None = Field(default=None, ge=0, le=24)
    close_hour: int | None = Field(default=None, ge=0, le=24)
    closed_weekdays: list[int] | None = None
    booking_window_days: int | None = Field(default=None, ge=1, le=60)
    cancel_before_hours: int | None = Field(default=None, ge=0, le=720)
    max_active_bookings_per_phone: int | None = Field(default=None, ge=0, le=100)

    @field_validator("closed_weekdays")
    @classmethod
    def _validate_weekdays(cls, value: list[int] | None) -> list[int] | None:
        if value is None:
            return value
        if any(day < 0 or day > 6 for day in value):
            raise ValueError("روزهای هفته باید بین ۰ تا ۶ باشند.")
        return sorted(set(value))


class ClosedDateCreate(BaseModel):
    """Body of a holiday creation request."""

    model_config = ConfigDict(extra="forbid")

    date: Date
    reason: str | None = Field(default=None, max_length=200)


class ClosedDateOut(BaseModel):
    """A holiday."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    date: Date
    reason: str | None = None
    created_at: datetime


class StatsSummary(BaseModel):
    """The numbers shown on the admin dashboard."""

    today_bookings: int
    upcoming_bookings: int
    revenue_completed_this_month: int
