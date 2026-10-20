"""Model level tests: schema, defaults, seed idempotency and the partial unique index."""

from __future__ import annotations

from datetime import UTC, date

import pytest
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.db.base import Base
from app.models import Booking, BookingStatus, ClosedDate, Service, ShopSettings
from app.seed import seed_database


def _make_booking(session: Session, code: str, day: date, time: str = "10:00") -> Booking:
    service = session.scalars(select(Service)).first()
    assert service is not None
    booking = Booking(
        code=code,
        service_id=service.id,
        date=day,
        time=time,
        customer_name="علی رضایی",
        phone="09121234567",
        status=BookingStatus.PENDING.value,
        price_at_booking=service.price,
    )
    session.add(booking)
    session.commit()
    return booking


def test_metadata_contains_all_tables() -> None:
    assert set(Base.metadata.tables) == {"services", "bookings", "shop_settings", "closed_dates"}


def test_seed_creates_six_services_and_settings(db_session: Session) -> None:
    services = db_session.scalars(select(Service).order_by(Service.sort_order)).all()
    assert [service.slug for service in services] == [
        "haircut",
        "beard",
        "shave",
        "styling",
        "facial",
        "package",
    ]
    assert [service.price for service in services] == [
        400000,
        350000,
        300000,
        500000,
        600000,
        750000,
    ]
    assert [service.duration_minutes for service in services] == [45, 30, 30, 30, 40, 90]
    assert [service.featured for service in services] == [
        False,
        False,
        False,
        False,
        False,
        True,
    ]
    assert services[0].includes == ["شست‌وشو", "کوتاهی", "حالت‌دهی"]

    settings_row = db_session.get(ShopSettings, 1)
    assert settings_row is not None
    assert settings_row.open_hour == 10
    assert settings_row.close_hour == 21
    assert settings_row.closed_weekdays == [4]
    assert settings_row.booking_window_days == 14
    assert settings_row.cancel_before_hours == 2
    assert settings_row.max_active_bookings_per_phone == 3


def test_seed_is_idempotent(db_session: Session) -> None:
    result = seed_database(db_session)
    assert result.services_created == 0
    assert result.settings_created is False
    assert len(db_session.scalars(select(Service)).all()) == 6
    assert len(db_session.scalars(select(ShopSettings)).all()) == 1


def test_service_defaults(db_session: Session) -> None:
    service = db_session.scalars(select(Service)).first()
    assert service is not None
    assert service.is_active is True
    assert service.featured is False
    assert service.created_at.tzinfo is not None
    assert service.created_at.utcoffset() == UTC.utcoffset(None)


def test_partial_unique_index_blocks_two_active_bookings(db_session: Session) -> None:
    _make_booking(db_session, "100001", date(2026, 10, 21))

    with pytest.raises(IntegrityError):
        _make_booking(db_session, "100002", date(2026, 10, 21))
    db_session.rollback()


def test_cancelled_booking_frees_the_slot(db_session: Session) -> None:
    booking = _make_booking(db_session, "100003", date(2026, 10, 21))
    booking.status = BookingStatus.CANCELLED.value
    db_session.commit()

    second = _make_booking(db_session, "100004", date(2026, 10, 21))
    assert second.code == "100004"


def test_same_slot_on_another_day_is_allowed(db_session: Session) -> None:
    _make_booking(db_session, "100005", date(2026, 10, 21), "10:00")
    other = _make_booking(db_session, "100006", date(2026, 10, 22), "10:00")
    assert other.date == date(2026, 10, 22)


def test_booking_code_is_unique(db_session: Session) -> None:
    _make_booking(db_session, "100007", date(2026, 10, 21))
    with pytest.raises(IntegrityError):
        _make_booking(db_session, "100007", date(2026, 10, 22))
    db_session.rollback()


def test_booking_requires_a_valid_status(db_session: Session) -> None:
    service = db_session.scalars(select(Service)).first()
    assert service is not None
    db_session.add(
        Booking(
            code="100008",
            service_id=service.id,
            date=date(2026, 10, 21),
            time="11:00",
            customer_name="علی رضایی",
            phone="09121234567",
            status="unknown",
            price_at_booking=service.price,
        )
    )
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()


def test_closed_date_is_unique(db_session: Session) -> None:
    db_session.add(ClosedDate(date=date(2026, 11, 4), reason="تعطیل"))
    db_session.commit()
    db_session.add(ClosedDate(date=date(2026, 11, 4), reason="تکراری"))
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()


def test_shop_settings_reject_invalid_hours(db_session: Session) -> None:
    settings_row = db_session.get(ShopSettings, 1)
    assert settings_row is not None
    settings_row.open_hour = 21
    settings_row.close_hour = 10
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()


def test_indexes_are_created(db_session: Session) -> None:
    booking_indexes = {index.name for index in Booking.__table__.indexes}
    assert "uq_bookings_active_slot" in booking_indexes
    assert "ix_bookings_phone" in booking_indexes
    assert "ix_bookings_date" in booking_indexes


def test_updated_at_refreshes_on_update(db_session: Session) -> None:
    settings_row = db_session.get(ShopSettings, 1)
    assert settings_row is not None
    before = settings_row.updated_at
    settings_row.open_hour = 9
    db_session.commit()
    db_session.refresh(settings_row)
    assert settings_row.updated_at >= before
