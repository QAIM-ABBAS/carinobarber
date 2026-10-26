"""Booking model with a database level guarantee of one active booking per slot."""

from __future__ import annotations

from datetime import date, datetime
from enum import StrEnum
from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, Date, ForeignKey, Index, Integer, String, Text, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import NOW, Base, UTCDateTime

if TYPE_CHECKING:  # pragma: no cover - typing only
    from app.models.service import Service
    from app.models.user import User


class BookingStatus(StrEnum):
    """Allowed lifecycle states of a booking."""

    PENDING = "pending"
    CONFIRMED = "confirmed"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    NO_SHOW = "no_show"


ACTIVE_STATUSES: tuple[str, ...] = (BookingStatus.PENDING.value, BookingStatus.CONFIRMED.value)


class Booking(Base):
    """A reservation of a single chair in a single time slot."""

    __tablename__ = "bookings"
    __table_args__ = (
        CheckConstraint(
            "status IN ('pending', 'confirmed', 'completed', 'cancelled', 'no_show')",
            name="ck_bookings_status",
        ),
        CheckConstraint("price_at_booking >= 0", name="ck_bookings_price_at_booking"),
        # Only one non cancelled booking may exist per slot. The partial unique index is
        # what protects the database against concurrent booking attempts.
        Index(
            "uq_bookings_active_slot",
            "date",
            "time",
            unique=True,
            postgresql_where=text("status <> 'cancelled'"),
            sqlite_where=text("status <> 'cancelled'"),
        ),
        Index("ix_bookings_phone", "phone"),
        Index("ix_bookings_date", "date"),
        Index("ix_bookings_user_id", "user_id"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    code: Mapped[str] = mapped_column(String(6), nullable=False, unique=True)
    service_id: Mapped[int] = mapped_column(
        ForeignKey("services.id", ondelete="RESTRICT"), nullable=False
    )
    date: Mapped[date] = mapped_column(Date, nullable=False)
    time: Mapped[str] = mapped_column(String(5), nullable=False)
    customer_name: Mapped[str] = mapped_column(String(100), nullable=False)
    phone: Mapped[str] = mapped_column(String(11), nullable=False)
    user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default=BookingStatus.PENDING.value,
        server_default=text("'pending'"),
    )
    price_at_booking: Mapped[int] = mapped_column(Integer, nullable=False)
    admin_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        UTCDateTime, nullable=False, server_default=text(NOW)
    )
    updated_at: Mapped[datetime] = mapped_column(
        UTCDateTime, nullable=False, server_default=text(NOW), onupdate=text(NOW)
    )

    service: Mapped[Service] = relationship(back_populates="bookings", lazy="joined")
    user: Mapped[User | None] = relationship(back_populates="bookings")

    def __repr__(self) -> str:  # pragma: no cover - debugging helper
        return f"<Booking id={self.id} code={self.code!r} {self.date} {self.time}>"
