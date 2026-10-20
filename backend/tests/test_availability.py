"""Tests for the availability endpoint."""

from __future__ import annotations

from datetime import date, datetime
from zoneinfo import ZoneInfo

from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.booking import Booking, BookingStatus
from app.models.closed_date import ClosedDate
from app.models.service import Service

SHOP_TZ = ZoneInfo("Asia/Tehran")

TODAY = "2026-10-19"  # Monday
TOMORROW = "2026-10-20"  # Tuesday
FRIDAY = "2026-10-23"  # closed weekday (weekday 4)
WINDOW_LAST_DAY = "2026-11-01"  # today + 13 days


def _add_booking(
    db_session: Session,
    day: str,
    slot: str,
    status: str = BookingStatus.PENDING.value,
    code: str = "555001",
) -> Booking:
    service = db_session.scalars(select(Service)).first()
    assert service is not None
    booking = Booking(
        code=code,
        service_id=service.id,
        date=date.fromisoformat(day),
        time=slot,
        customer_name="علی رضایی",
        phone="09121234567",
        status=status,
        price_at_booking=service.price,
    )
    db_session.add(booking)
    db_session.commit()
    return booking


def test_availability_defaults_to_today_and_the_booking_window(client: TestClient) -> None:
    response = client.get("/api/v1/availability")
    assert response.status_code == 200
    days = response.json()["days"]
    assert len(days) == 14
    assert days[0]["date"] == TODAY
    assert days[-1]["date"] == WINDOW_LAST_DAY


def test_availability_accepts_an_explicit_start_and_length(client: TestClient) -> None:
    response = client.get(f"/api/v1/availability?start={TOMORROW}&days=3")
    assert response.status_code == 200
    days = response.json()["days"]
    assert [day["date"] for day in days] == ["2026-10-20", "2026-10-21", "2026-10-22"]


def test_days_are_clamped_to_the_booking_window(client: TestClient) -> None:
    response = client.get(f"/api/v1/availability?start={TODAY}&days=31")
    assert response.status_code == 200
    days = response.json()["days"]
    assert len(days) == 14
    assert days[-1]["date"] == WINDOW_LAST_DAY


def test_days_below_one_are_rejected(client: TestClient) -> None:
    response = client.get("/api/v1/availability?days=0")
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "validation_error"


def test_days_above_the_maximum_are_rejected(client: TestClient) -> None:
    response = client.get("/api/v1/availability?days=32")
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "validation_error"


def test_start_before_today_is_rejected(client: TestClient) -> None:
    response = client.get("/api/v1/availability?start=2026-10-18")
    assert response.status_code == 422
    body = response.json()
    assert body["error"]["code"] == "date_out_of_range"
    assert body["error"]["message"]
    assert body["error"]["details"] is None


def test_start_after_the_window_is_rejected(client: TestClient) -> None:
    response = client.get("/api/v1/availability?start=2026-11-02")
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "date_out_of_range"


def test_the_last_day_of_the_window_is_accepted(client: TestClient) -> None:
    response = client.get(f"/api/v1/availability?start={WINDOW_LAST_DAY}&days=5")
    assert response.status_code == 200
    days = response.json()["days"]
    assert len(days) == 1
    assert days[0]["date"] == WINDOW_LAST_DAY


def test_slots_are_hourly_from_open_to_close_hour(client: TestClient) -> None:
    response = client.get(f"/api/v1/availability?start={TOMORROW}&days=1")
    assert response.status_code == 200
    day = response.json()["days"][0]
    assert [slot["time"] for slot in day["slots"]] == [
        "10:00",
        "11:00",
        "12:00",
        "13:00",
        "14:00",
        "15:00",
        "16:00",
        "17:00",
        "18:00",
        "19:00",
        "20:00",
    ]


def test_friday_is_closed(client: TestClient) -> None:
    response = client.get(f"/api/v1/availability?start={FRIDAY}&days=1")
    assert response.status_code == 200
    day = response.json()["days"][0]
    assert day["closed"] is True
    assert day["available"] is False
    assert day["slots"]
    assert all(slot["available"] is False for slot in day["slots"])


def test_a_holiday_is_closed(client: TestClient, db_session: Session) -> None:
    db_session.add(ClosedDate(date=date.fromisoformat(TOMORROW), reason="تعطیل تست"))
    db_session.commit()

    response = client.get(f"/api/v1/availability?start={TOMORROW}&days=1")
    day = response.json()["days"][0]
    assert day["closed"] is True
    assert day["available"] is False


def test_past_slots_of_today_are_unavailable(client: TestClient, set_now) -> None:
    set_now(datetime(2026, 10, 19, 14, 30, tzinfo=SHOP_TZ))
    response = client.get(f"/api/v1/availability?start={TODAY}&days=1")
    day = response.json()["days"][0]
    slots = {slot["time"]: slot["available"] for slot in day["slots"]}
    assert slots["10:00"] is False
    assert slots["14:00"] is False
    assert slots["15:00"] is True
    assert day["available"] is True


def test_every_slot_of_today_is_unavailable_after_closing(client: TestClient, set_now) -> None:
    set_now(datetime(2026, 10, 19, 20, 30, tzinfo=SHOP_TZ))
    response = client.get(f"/api/v1/availability?start={TODAY}&days=1")
    day = response.json()["days"][0]
    assert all(slot["available"] is False for slot in day["slots"])
    assert day["available"] is False


def test_a_booked_slot_is_unavailable(client: TestClient, db_session: Session) -> None:
    _add_booking(db_session, TOMORROW, "10:00")

    response = client.get(f"/api/v1/availability?start={TOMORROW}&days=1")
    day = response.json()["days"][0]
    slots = {slot["time"]: slot["available"] for slot in day["slots"]}
    assert slots["10:00"] is False
    assert slots["11:00"] is True
    assert day["available"] is True


def test_a_cancelled_booking_frees_the_slot(client: TestClient, db_session: Session) -> None:
    _add_booking(db_session, TOMORROW, "10:00", status=BookingStatus.CANCELLED.value)

    response = client.get(f"/api/v1/availability?start={TOMORROW}&days=1")
    day = response.json()["days"][0]
    slots = {slot["time"]: slot["available"] for slot in day["slots"]}
    assert slots["10:00"] is True


def test_days_are_returned_in_ascending_order(client: TestClient) -> None:
    days = client.get("/api/v1/availability").json()["days"]
    dates = [day["date"] for day in days]
    assert dates == sorted(dates)
