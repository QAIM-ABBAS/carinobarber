"""A customer account identified by a verified mobile phone number."""

from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import String, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import NOW, Base, UTCDateTime

if TYPE_CHECKING:  # pragma: no cover - typing only
    from app.models.booking import Booking


class User(Base):
    """A customer. There is no password: login is phone + one time code."""

    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    phone: Mapped[str] = mapped_column(String(11), nullable=False, unique=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        UTCDateTime, nullable=False, server_default=text(NOW)
    )
    updated_at: Mapped[datetime] = mapped_column(
        UTCDateTime, nullable=False, server_default=text(NOW), onupdate=text(NOW)
    )
    last_login_at: Mapped[datetime | None] = mapped_column(UTCDateTime, nullable=True)

    bookings: Mapped[list[Booking]] = relationship(
        back_populates="user", cascade="save-update, merge"
    )

    def __repr__(self) -> str:  # pragma: no cover - debugging helper
        return f"<User id={self.id} phone={self.phone!r}>"
