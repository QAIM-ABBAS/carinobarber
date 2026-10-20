"""Schemas for the availability endpoint."""

from __future__ import annotations

from datetime import date as Date

from pydantic import BaseModel, ConfigDict, Field


class SlotOut(BaseModel):
    """A single bookable time slot."""

    model_config = ConfigDict(from_attributes=True)

    time: str = Field(description="ساعت شروع به فرمت HH:mm")
    available: bool = Field(description="آیا این ساعت آزاد است؟")


class DayAvailabilityOut(BaseModel):
    """Availability information of a single day."""

    model_config = ConfigDict(from_attributes=True)

    date: Date = Field(description="تاریخ میلادی روز به فرمت YYYY-MM-DD")
    closed: bool = Field(description="آیا باشگاه در این روز تعطیل است؟")
    available: bool = Field(description="آیا حداقل یک ساعت آزاد وجود دارد؟")
    slots: list[SlotOut] = Field(default_factory=list, description="ساعت‌های کاری روز")


class AvailabilityOut(BaseModel):
    """Availability of a range of days."""

    days: list[DayAvailabilityOut] = Field(default_factory=list)
