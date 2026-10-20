"""Schemas for the public booking endpoints."""

from __future__ import annotations

from datetime import date as Date

from pydantic import BaseModel, ConfigDict, Field, field_validator


class BookingCreate(BaseModel):
    """Body of a booking creation request."""

    model_config = ConfigDict(extra="forbid")

    service_id: str = Field(min_length=1, max_length=50, description="شناسه خدمت (slug)")
    date: Date = Field(description="تاریخ نوبت به فرمت YYYY-MM-DD")
    time: str = Field(min_length=1, max_length=10, description="ساعت نوبت به فرمت HH:mm")
    name: str = Field(min_length=2, max_length=100, description="نام و نام خانوادگی")
    phone: str = Field(max_length=64, description="شماره موبایل")

    @field_validator("name", mode="before")
    @classmethod
    def _strip_name(cls, value: object) -> object:
        if isinstance(value, str):
            return value.strip()
        return value


class BookingCancel(BaseModel):
    """Body of a cancellation request."""

    model_config = ConfigDict(extra="forbid")

    phone: str = Field(max_length=64, description="شماره موبایلی که نوبت با آن ثبت شده است")


class BookingServiceOut(BaseModel):
    """The service a booking refers to."""

    model_config = ConfigDict(from_attributes=True)

    id: str = Field(description="شناسهٔ عمومی خدمت (slug)")
    label: str = Field(description="نام خدمت")
    price: int = Field(description="قیمت به تومان")


class BookingOut(BaseModel):
    """A booking as returned by the public API."""

    model_config = ConfigDict(from_attributes=True)

    code: str = Field(description="کد پیگیری شش رقمی")
    status: str = Field(description="وضعیت نوبت")
    service: BookingServiceOut
    date: Date = Field(description="تاریخ نوبت به فرمت YYYY-MM-DD")
    time: str = Field(description="ساعت نوبت به فرمت HH:mm")
    name: str = Field(description="نام مشتری")
    phone: str = Field(description="شماره موبایل نرمال‌شده")
