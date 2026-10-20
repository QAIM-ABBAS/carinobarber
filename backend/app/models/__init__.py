"""SQLAlchemy models. Importing this package registers every table on the metadata."""

from __future__ import annotations

from app.models.booking import ACTIVE_STATUSES, Booking, BookingStatus
from app.models.closed_date import ClosedDate
from app.models.service import Service
from app.models.shop_settings import SETTINGS_ROW_ID, ShopSettings

__all__ = [
    "ACTIVE_STATUSES",
    "SETTINGS_ROW_ID",
    "Booking",
    "BookingStatus",
    "ClosedDate",
    "Service",
    "ShopSettings",
]
