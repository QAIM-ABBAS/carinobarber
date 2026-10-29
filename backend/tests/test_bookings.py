"""Tests for creating, looking up and cancelling bookings."""

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


def _payload(**overrides: object) -> dict[str, object]:
    payload: dict[str, object] = {
        "service_id": "beard",
        "date": TOMORROW,
        "time": "10:00",
        "name": "علی رضایی",
        "phone": "۰۹۱۲۱۲۳۴۵۶۷",
    }
    payload.update(overrides)
    return payload


def test_booking_without_a_token_returns_401(client: TestClient) -> None:
    response = client.post("/api/v1/bookings", json=_payload())
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "unauthorized"


def test_an_admin_token_cannot_create_a_customer_booking(
    client: TestClient, admin_headers
) -> None:
    response = client.post("/api/v1/bookings", headers=admin_headers, json=_payload())
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "unauthorized"


def test_booking_happy_path(
    client: TestClient, customer_headers, sms_spy: SpySmsProvider
) -> None:
    response = client.post("/api/v1/bookings", headers=customer_headers, json=_payload())
    assert response.status_code == 201
    body = response.json()
    assert len(body["code"]) == 6
    assert body["code"].isdigit()
    assert body["status"] == "pending"
    assert body["phone"] == PHONE
    assert body["date"] == TOMORROW
    assert body["time"] == "10:00"
    assert body["name"] == "علی رضایی"
    assert body["service"] == {"id": "beard", "label": "اصلاح و مدل ریش", "price": 350000}


def test_the_phone_of_the_body_is_ignored(
    client: TestClient, customer_headers, sms_spy: SpySmsProvider
) -> None:
    response = client.post(
        "/api/v1/bookings",
        headers=customer_headers,
        json=_payload(phone="09121111111"),
    )
    assert response.status_code == 201
    assert response.json()["phone"] == PHONE


def test_booking_sends_a_persian_sms(
    client: TestClient, customer_headers, sms_spy: SpySmsProvider
) -> None:
    response = client.post("/api/v1/bookings", headers=customer_headers, json=_payload())
    assert response.status_code == 201
    code = response.json()["code"]
    assert len(sms_spy.messages) == 1
    phone, text = sms_spy.last_message
    assert phone == PHONE
    assert "Carino Barber" in text
    assert code in text
    assert TOMORROW in text
    assert "10:00" in text


def test_booking_stores_the_price_and_the_user(
    client: TestClient,
    customer_headers,
    customer_user,
    db_session: Session,
    sms_spy: SpySmsProvider,
) -> None:
    client.post(
        "/api/v1/bookings",
        headers=customer_headers,
        json=_payload(service_id="package"),
    )
    booking = db_session.scalars(select(Booking)).first()
    assert booking is not None
    assert booking.price_at_booking == 750000
    assert booking.user_id == customer_user.id


def test_booking_with_unknown_service_returns_404(
    client: TestClient, customer_headers
) -> None:
    response = client.post(
        "/api/v1/bookings",
        headers=customer_headers,
        json=_payload(service_id="unknown"),
    )
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "service_not_found"


def test_booking_with_inactive_service_returns_404(
    client: TestClient, customer_headers, db_session: Session, sms_spy: SpySmsProvider
) -> None:
    service = db_session.scalars(select(Service).where(Service.slug == "beard")).one()
    service.is_active = False
    db_session.commit()

    response = client.post("/api/v1/bookings", headers=customer_headers, json=_payload())
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "service_not_found"


def test_booking_outside_the_window_returns_422(
    client: TestClient, customer_headers
) -> None:
    response = client.post(
        "/api/v1/bookings",
        headers=customer_headers,
        json=_payload(date="2026-11-05"),
    )
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "date_out_of_range"


def test_booking_before_today_returns_422(client: TestClient, customer_headers) -> None:
    response = client.post(
        "/api/v1/bookings",
        headers=customer_headers,
        json=_payload(date="2026-10-18"),
    )
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "date_out_of_range"


def test_booking_on_a_closed_day_returns_409(
    client: TestClient, customer_headers
) -> None:
    response = client.post(
        "/api/v1/bookings",
        headers=customer_headers,
        json=_payload(date=FRIDAY),
    )
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "day_closed"


def test_booking_with_an_invalid_time_returns_422(
    client: TestClient, customer_headers
) -> None:
    response = client.post(
        "/api/v1/bookings",
        headers=customer_headers,
        json=_payload(time="10:30"),
    )
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "invalid_time"


def test_booking_outside_the_opening_hours_returns_422(
    client: TestClient, customer_headers
) -> None:
    response = client.post(
        "/api/v1/bookings",
        headers=customer_headers,
        json=_payload(time="21:00"),
    )
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "invalid_time"


def test_booking_in_the_past_returns_409(
    client: TestClient, customer_headers, set_now
) -> None:
    set_now(datetime(2026, 10, 19, 14, 30, tzinfo=SHOP_TZ))
    response = client.post(
        "/api/v1/bookings",
        headers=customer_headers,
        json=_payload(date="2026-10-19", time="10:00"),
    )
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "slot_in_past"


def test_second_booking_of_the_same_slot_returns_409(
    client: TestClient,
    customer_headers,
    customer_headers_for_phone,
    db_session: Session,
    sms_spy: SpySmsProvider,
) -> None:
    first = client.post("/api/v1/bookings", headers=customer_headers, json=_payload())
    assert first.status_code == 201

    other_headers = customer_headers_for_phone("09121111111")
    second = client.post(
        "/api/v1/bookings", headers=other_headers, json=_payload(phone="09121111111")
    )
    assert second.status_code == 409
    assert second.json()["error"]["code"] == "slot_taken"


def test_too_many_active_bookings_for_one_phone(
    client: TestClient, customer_headers, sms_spy: SpySmsProvider
) -> None:
    for day in ("2026-10-20", "2026-10-21", "2026-10-22"):
        response = client.post(
            "/api/v1/bookings", headers=customer_headers, json=_payload(date=day)
        )
        assert response.status_code == 201

    response = client.post(
        "/api/v1/bookings",
        headers=customer_headers,
        json=_payload(date="2026-10-24"),
    )
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "too_many_active_bookings"


def test_booking_with_a_short_name_returns_422(
    client: TestClient, customer_headers
) -> None:
    response = client.post(
        "/api/v1/bookings", headers=customer_headers, json=_payload(name="a")
    )
    assert response.status_code == 422
    body = response.json()
    assert body["error"]["code"] == "validation_error"
    assert body["error"]["details"]
    assert body["error"]["details"][0]["field"] == "name"


def test_booking_with_a_blank_name_returns_422(
    client: TestClient, customer_headers
) -> None:
    response = client.post(
        "/api/v1/bookings", headers=customer_headers, json=_payload(name="   ")
    )
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "validation_error"


def test_lookup_returns_the_booking(
    client: TestClient, customer_headers, sms_spy: SpySmsProvider
) -> None:
    created = client.post(
        "/api/v1/bookings", headers=customer_headers, json=_payload()
    ).json()
    response = client.get(f"/api/v1/bookings/{created['code']}", params={"phone": PHONE})
    assert response.status_code == 200
    assert response.json() == created


def test_lookup_with_a_wrong_phone_returns_404(
    client: TestClient, customer_headers, sms_spy: SpySmsProvider
) -> None:
    created = client.post(
        "/api/v1/bookings", headers=customer_headers, json=_payload()
    ).json()
    response = client.get(f"/api/v1/bookings/{created['code']}", params={"phone": "09121111111"})
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "booking_not_found"


def test_lookup_with_an_unknown_code_returns_404(client: TestClient) -> None:
    response = client.get("/api/v1/bookings/000000", params={"phone": PHONE})
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "booking_not_found"


def test_cancel_frees_the_slot(
    client: TestClient, customer_headers, sms_spy: SpySmsProvider
) -> None:
    created = client.post(
        "/api/v1/bookings", headers=customer_headers, json=_payload()
    ).json()
    cancelled = client.post(f"/api/v1/bookings/{created['code']}/cancel", json={"phone": PHONE})
    assert cancelled.status_code == 200
    assert cancelled.json()["status"] == "cancelled"

    again = client.post(
        "/api/v1/bookings", headers=customer_headers, json=_payload(time="11:00")
    )
    assert again.status_code == 201


def test_cancel_sends_a_persian_sms(
    client: TestClient, customer_headers, sms_spy: SpySmsProvider
) -> None:
    created = client.post(
        "/api/v1/bookings", headers=customer_headers, json=_payload()
    ).json()
    sms_spy.messages.clear()
    client.post(f"/api/v1/bookings/{created['code']}/cancel", json={"phone": PHONE})
    assert len(sms_spy.messages) == 1
    _, text = sms_spy.last_message
    assert "لغو شد" in text
    assert created["code"] in text


def test_cancel_too_late_returns_409(
    client: TestClient, customer_headers, set_now, sms_spy: SpySmsProvider
) -> None:
    set_now(datetime(2026, 10, 20, 8, 30, tzinfo=SHOP_TZ))
    created = client.post(
        "/api/v1/bookings", headers=customer_headers, json=_payload()
    ).json()
    response = client.post(f"/api/v1/bookings/{created['code']}/cancel", json={"phone": PHONE})
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "cancel_not_allowed"


def test_cancel_with_a_wrong_phone_returns_404(
    client: TestClient, customer_headers, sms_spy: SpySmsProvider
) -> None:
    created = client.post(
        "/api/v1/bookings", headers=customer_headers, json=_payload()
    ).json()
    response = client.post(
        f"/api/v1/bookings/{created['code']}/cancel", json={"phone": "09121111111"}
    )
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "booking_not_found"


def test_cancel_of_an_unknown_code_returns_404(client: TestClient) -> None:
    response = client.post("/api/v1/bookings/000000/cancel", json={"phone": PHONE})
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "booking_not_found"


def test_cancelling_twice_returns_409(
    client: TestClient, customer_headers, sms_spy: SpySmsProvider
) -> None:
    created = client.post(
        "/api/v1/bookings", headers=customer_headers, json=_payload()
    ).json()
    client.post(f"/api/v1/bookings/{created['code']}/cancel", json={"phone": PHONE})
    response = client.post(f"/api/v1/bookings/{created['code']}/cancel", json={"phone": PHONE})
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "cancel_not_allowed"


def test_booking_codes_are_unique(
    client: TestClient, customer_headers, sms_spy: SpySmsProvider
) -> None:
    first = client.post(
        "/api/v1/bookings", headers=customer_headers, json=_payload()
    ).json()
    second = client.post(
        "/api/v1/bookings",
        headers=customer_headers,
        json=_payload(time="11:00"),
    ).json()
    assert first["code"] != second["code"]


def test_rate_limit_is_enforced(
    client: TestClient, customer_headers, sms_spy: SpySmsProvider
) -> None:
    for hour in ("10:00", "11:00", "12:00", "13:00", "14:00"):
        response = client.post(
            "/api/v1/bookings",
            headers=customer_headers,
            json=_payload(time=hour),
        )
        assert response.status_code == 201
        cancelled = client.post(
            f"/api/v1/me/bookings/{response.json()['code']}/cancel",
            headers=customer_headers,
        )
        assert cancelled.status_code == 200

    blocked = client.post(
        "/api/v1/bookings", headers=customer_headers, json=_payload(time="15:00")
    )
    assert blocked.status_code == 429
    assert blocked.json()["error"]["code"] == "rate_limited"


def test_error_envelope_is_unified(client: TestClient, customer_headers) -> None:
    not_found = client.get("/api/v1/bookings/000000", params={"phone": PHONE})
    assert set(not_found.json()["error"]) == {"code", "message", "details"}

    invalid = client.post(
        "/api/v1/bookings", headers=customer_headers, json=_payload(name="a")
    )
    assert set(invalid.json()["error"]) == {"code", "message", "details"}
    assert invalid.json()["error"]["message"]
