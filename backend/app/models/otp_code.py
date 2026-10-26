"""One time codes used to verify a customer phone number."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import CheckConstraint, Integer, String, text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import NOW, Base, UTCDateTime


class OtpCode(Base):
    """A hashed OTP row. The plain code is never stored."""

    __tablename__ = "otp_codes"
    __table_args__ = (CheckConstraint("attempts >= 0", name="ck_otp_codes_attempts"),)

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    phone: Mapped[str] = mapped_column(String(11), nullable=False, index=True)
    code_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(UTCDateTime, nullable=False)
    attempts: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0, server_default=text("0")
    )
    consumed_at: Mapped[datetime | None] = mapped_column(UTCDateTime, nullable=True)
    ip: Mapped[str | None] = mapped_column(String(45), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        UTCDateTime, nullable=False, server_default=text(NOW)
    )

    def __repr__(self) -> str:  # pragma: no cover - debugging helper
        consumed = self.consumed_at is not None
        return f"<OtpCode id={self.id} phone={self.phone!r} consumed={consumed}>"
