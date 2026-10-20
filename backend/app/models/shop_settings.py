"""Shop settings model. The table always holds exactly one row (id=1)."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import CheckConstraint, Integer, text
from sqlalchemy.ext.mutable import MutableList
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.types import JSON

from app.db.base import NOW, Base, UTCDateTime

SETTINGS_ROW_ID = 1


class ShopSettings(Base):
    """Opening hours, booking window and per customer limits."""

    __tablename__ = "shop_settings"
    __table_args__ = (
        CheckConstraint("open_hour >= 0 AND open_hour <= 24", name="ck_shop_settings_open_hour"),
        CheckConstraint("close_hour >= 0 AND close_hour <= 24", name="ck_shop_settings_close_hour"),
        CheckConstraint("open_hour < close_hour", name="ck_shop_settings_hours_order"),
        CheckConstraint(
            "booking_window_days >= 1 AND booking_window_days <= 60",
            name="ck_shop_settings_booking_window_days",
        ),
        CheckConstraint("cancel_before_hours >= 0", name="ck_shop_settings_cancel_before_hours"),
        CheckConstraint(
            "max_active_bookings_per_phone >= 0",
            name="ck_shop_settings_max_active_bookings_per_phone",
        ),
    )

    id: Mapped[int] = mapped_column(
        Integer, primary_key=True, default=SETTINGS_ROW_ID, autoincrement=False
    )
    open_hour: Mapped[int] = mapped_column(
        Integer, nullable=False, default=10, server_default=text("10")
    )
    close_hour: Mapped[int] = mapped_column(
        Integer, nullable=False, default=21, server_default=text("21")
    )
    closed_weekdays: Mapped[list[int]] = mapped_column(
        MutableList.as_mutable(JSON), nullable=False, default=lambda: [4]
    )
    booking_window_days: Mapped[int] = mapped_column(
        Integer, nullable=False, default=14, server_default=text("14")
    )
    cancel_before_hours: Mapped[int] = mapped_column(
        Integer, nullable=False, default=2, server_default=text("2")
    )
    max_active_bookings_per_phone: Mapped[int] = mapped_column(
        Integer, nullable=False, default=3, server_default=text("3")
    )
    created_at: Mapped[datetime] = mapped_column(
        UTCDateTime, nullable=False, server_default=text(NOW)
    )
    updated_at: Mapped[datetime] = mapped_column(
        UTCDateTime, nullable=False, server_default=text(NOW), onupdate=text(NOW)
    )

    def __repr__(self) -> str:  # pragma: no cover - debugging helper
        return f"<ShopSettings id={self.id} hours={self.open_hour}-{self.close_hour}>"
