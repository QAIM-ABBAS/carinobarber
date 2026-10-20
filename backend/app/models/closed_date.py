"""Holiday / closed date model."""

from __future__ import annotations

from datetime import date, datetime

from sqlalchemy import Date, Integer, String, text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import NOW, Base, UTCDateTime


class ClosedDate(Base):
    """A calendar day on which the barbershop does not open."""

    __tablename__ = "closed_dates"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    date: Mapped[date] = mapped_column(Date, nullable=False, unique=True)
    reason: Mapped[str | None] = mapped_column(String(200), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        UTCDateTime, nullable=False, server_default=text(NOW)
    )
    updated_at: Mapped[datetime] = mapped_column(
        UTCDateTime, nullable=False, server_default=text(NOW), onupdate=text(NOW)
    )

    def __repr__(self) -> str:  # pragma: no cover - debugging helper
        return f"<ClosedDate id={self.id} date={self.date}>"
