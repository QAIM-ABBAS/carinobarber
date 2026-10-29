"""Tests for the admin booking endpoints (manual booking and single booking)."""

from __future__ import annotations

from datetime import datetime

from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.booking import Booking
from app.models.service import Service
from tests.helpers import SHOP_TZ, SpySmsProvider

TOMORROW = "2026-10-20"
FRIDAY = "2026-10-23"
PHONE = "09121234567"
# 58 days after the frozen "now" (2026-10-19) — outside the public booking window.
FAR_AHEAD = "2026-12-16"
# More than 90 days after the frozen "now".
TOO_FAR_AHEAD = "2027-01-20"


def _payload(**overrides: object) -> dict[str, object]:
    payload: dict[str, object] = {
        "service_id": "beard",
        "date": TOMORROW,
        "time": "12:00",
        "name": "علی رضایی",
        "phone": "۰۹۱۲۱۲۳۴۵۶۷",
    }
    payload.update(overrides)
    return payload


def test_admin_can_create_a_confirmed_booking(client: TestClient, admin_headers) -> None:
    response = client.post(
        "/api/v1/admin/bookings", headers=admin_headers, json=_payload(status="confirmed")
    )
    assert response.status_code == 201
    body = response.json()
    assert body["status"] == "confirmed"
    assert body["service"] == {"id": "beard", "label": "اصلاح و مدل ریش"}
    assert body["phone"] == PHONE
    assert body["name"] == "علی رضایی"
    assert body["date"] == TOMORROW
    assert body["time"] == "12:00"
    assert body["price_at_booking"] == 350000
    assert body["admin_note"] is None
    assert len(body["code"]) == 6
    assert body["id"] > 0


def test_admin_booking_defaults_to_confirmed(client: TestClient, admin_headers) -> None:
    response = client.post("/api/v1/admin/bookings", headers=admin_headers, json=_payload())
    assert response.status_code == 201
    assert response.json()["status"] == "confirmed"


def test_admin_can_create_a_pending_booking(client: TestClient, admin_headers) -> None:
    response = client.post(
        "/api/v1/admin/bookings", headers=admin_headers, json=_payload(status="pending")
    )
    assert response.status_code == 201
    assert response.json()["status"] == "pending"


def test_admin_booking_stores_the_admin_note(client: TestClient, admin_headers) -> None:
    response = client.post(
        "/api/v1/admin/bookings",
        headers=admin_headers,
        json=_payload(admin_note="مشتری تلفنی"),
    )
    assert response.status_code == 201
    assert response.json()["admin_note"] == "مشتری تلفنی"


def test_a_confirmed_admin_booking_sends_the_sms(
    client: TestClient, admin_headers, sms_spy: SpySmsProvider
) -> None:
    response = client.post(
        "/api/v1/admin/bookings", headers=admin_headers, json=_payload(status="confirmed")
    )
    assert response.status_code == 201
    assert len(sms_spy.messages) == 1
    phone, text = sms_spy.last_message
    assert phone == PHONE
    assert "Carino Barber" in text
    assert response.json()["code"] in text


def test_a_pending_admin_booking_sends_no_sms(
    client: TestClient, admin_headers, sms_spy: SpySmsProvider
) -> None:
    response = client.post(
        "/api/v1/admin/bookings", headers=admin_headers, json=_payload(status="pending")
    )
    assert response.status_code == 201
    assert sms_spy.messages == []


def test_the_admin_booking_is_not_rate_limited(client: TestClient, admin_headers) -> None:
    for index in range(7):
        response = client.post(
            "/api/v1/admin/bookings",
            headers=admin_headers,
            json=_payload(time=f"{10 + index}:00", phone=f"0912123450{index}"),
        )
        assert response.status_code == 201


def test_the_admin_booking_lifts_the_phone_limit(
    client: TestClient, admin_headers, db_session: Session
) -> None:
    """The shop allows three active bookings per phone; the admin may book more."""
    days = ("2026-10-20", "2026-10-21", "2026-10-22", "2026-10-24")
    for day in days:
        response = client.post(
            "/api/v1/admin/bookings", headers=admin_headers, json=_payload(date=day)
        )
        assert response.status_code == 201

    active = db_session.scalars(select(Booking).where(Booking.phone == PHONE)).all()
    assert len(active) == len(days)


def test_the_admin_booking_accepts_a_date_far_ahead(client: TestClient, admin_headers) -> None:
    response = client.post(
        "/api/v1/admin/bookings", headers=admin_headers, json=_payload(date=FAR_AHEAD)
    )
    assert response.status_code == 201
    assert response.json()["date"] == FAR_AHEAD


def test_the_admin_booking_rejects_a_date_beyond_90_days(client: TestClient, admin_headers) -> None:
    response = client.post(
        "/api/v1/admin/bookings", headers=admin_headers, json=_payload(date=TOO_FAR_AHEAD)
    )
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "date_out_of_range"


def test_the_admin_booking_rejects_a_date_in_the_past(client: TestClient, admin_headers) -> None:
    response = client.post(
        "/api/v1/admin/bookings", headers=admin_headers, json=_payload(date="2026-10-18")
    )
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "date_out_of_range"


def test_the_admin_booking_with_an_unknown_service_returns_404(
    client: TestClient, admin_headers
) -> None:
    response = client.post(
        "/api/v1/admin/bookings", headers=admin_headers, json=_payload(service_id="unknown")
    )
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "service_not_found"


def test_the_admin_booking_with_an_inactive_service_returns_404(
    client: TestClient, admin_headers, db_session: Session
) -> None:
    service = db_session.scalars(select(Service).where(Service.slug == "beard")).one()
    service.is_active = False
    db_session.commit()

    response = client.post("/api/v1/admin/bookings", headers=admin_headers, json=_payload())
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "service_not_found"


def test_the_admin_booking_on_a_closed_day_returns_409(client: TestClient, admin_headers) -> None:
    response = client.post(
        "/api/v1/admin/bookings", headers=admin_headers, json=_payload(date=FRIDAY)
    )
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "day_closed"


def test_the_admin_booking_with_an_invalid_time_returns_422(
    client: TestClient, admin_headers
) -> None:
    response = client.post(
        "/api/v1/admin/bookings", headers=admin_headers, json=_payload(time="12:30")
    )
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "invalid_time"


def test_the_admin_booking_outside_the_opening_hours_returns_422(
    client: TestClient, admin_headers
) -> None:
    response = client.post(
        "/api/v1/admin/bookings", headers=admin_headers, json=_payload(time="21:00")
    )
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "invalid_time"


def test_the_admin_booking_in_the_past_returns_409(
    client: TestClient, admin_headers, set_now
) -> None:
    set_now(datetime(2026, 10, 19, 14, 30, tzinfo=SHOP_TZ))
    response = client.post(
        "/api/v1/admin/bookings", headers=admin_headers, json=_payload(date="2026-10-19")
    )
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "slot_in_past"


def test_a_taken_slot_returns_409_slot_taken(client: TestClient, admin_headers) -> None:
    first = client.post("/api/v1/admin/bookings", headers=admin_headers, json=_payload())
    assert first.status_code == 201

    second = client.post(
        "/api/v1/admin/bookings",
        headers=admin_headers,
        json=_payload(phone="09121111111"),
    )
    assert second.status_code == 409
    assert second.json()["error"]["code"] == "slot_taken"


def test_the_admin_booking_with_an_invalid_phone_returns_422(
    client: TestClient, admin_headers
) -> None:
    response = client.post(
        "/api/v1/admin/bookings", headers=admin_headers, json=_payload(phone="12345")
    )
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "invalid_phone"


def test_the_admin_booking_with_an_unknown_status_returns_422(
    client: TestClient, admin_headers
) -> None:
    response = client.post(
        "/api/v1/admin/bookings", headers=admin_headers, json=_payload(status="completed")
    )
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "validation_error"


def test_the_admin_booking_without_a_token_returns_401(client: TestClient) -> None:
    response = client.post("/api/v1/admin/bookings", json=_payload())
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "unauthorized"


def test_the_admin_booking_appears_in_the_list(client: TestClient, admin_headers) -> None:
    created = client.post("/api/v1/admin/bookings", headers=admin_headers, json=_payload()).json()

    listing = client.get("/api/v1/admin/bookings", headers=admin_headers).json()
    assert listing["total"] == 1
    assert listing["items"][0]["id"] == created["id"]


def test_the_admin_can_read_a_single_booking(client: TestClient, admin_headers) -> None:
    created = client.post("/api/v1/admin/bookings", headers=admin_headers, json=_payload()).json()

    response = client.get(f"/api/v1/admin/bookings/{created['id']}", headers=admin_headers)
    assert response.status_code == 200
    assert response.json() == created


def test_reading_an_unknown_booking_returns_404(client: TestClient, admin_headers) -> None:
    response = client.get("/api/v1/admin/bookings/9999", headers=admin_headers)
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "booking_not_found"


def test_reading_a_booking_without_a_token_returns_401(client: TestClient) -> None:
    response = client.get("/api/v1/admin/bookings/1")
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "unauthorized"
