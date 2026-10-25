"""Schemas for the public service catalog."""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field


class ServiceOut(BaseModel):
    """A service as exposed to the public API. ``id`` is the service slug."""

    model_config = ConfigDict(from_attributes=True)

    id: str = Field(description="شناسهٔ عمومی خدمت (slug)")
    label: str = Field(description="نام خدمت")
    description: str = Field(description="توضیح خدمت")
    price: int = Field(description="قیمت به تومان")
    duration_minutes: int = Field(description="مدت زمان به دقیقه")
    includes: list[str] = Field(default_factory=list, description="موارد شامل خدمت")
    images: list[str] = Field(default_factory=list, description="تصاویر خدمت")
    featured: bool = Field(default=False, description="خدمت ویژه")
