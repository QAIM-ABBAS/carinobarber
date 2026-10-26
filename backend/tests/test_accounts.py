"""Tests for the customer profile, bookings and account cancellation."""

from __future__ import annotations

from datetime import date

from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.booking import Booking
from app.models.service import Service
from app.models.user import User
from tests.helpers import SpySmsProvider, make_customer

TOMORROW = "2026-10-20"
PHONE = "09121234567"


def _add_booking(
    session: Session,
    user: User,
    code: str,
    day: str,
    time: str = "10:00",
    status: str = "pending",
) -> Booking:
    service = session.scalars(select(Service).where(Service.slug == "beard")).one()
    booking = Booking(
        code=code,
        service_id=service.id,
        date=date.fromisoformat(day),
        time=time,
        customer_name=user.name,
        phone=user.phone,
        user_id=user.id,
        status=status,
        price_at_booking=service.price,
    )
    session.add(booking)
    session.commit()
    return booking


def test_me_get_and_patch(
    client: TestClient, customer_headers, customer_user: User
) -> None:
    response = client.get("/api/v1/me", headers=customer_headers)
    assert response.status_code == 200
    body = response.json()
    assert set(body) == {"id", "name", "phone", "created_at"}
    assert body["id"] == customer_user.id
    assert body["name"] == customer_user.name
    assert body["phone"] == customer_user.phone
    assert body["created_at"]

    updated = client.patch(
        "/api/v1/me", headers=customer_headers, json={"name": "  نام تازه  "}
    )
    assert updated.status_code == 200
    assert updated.json()["name"] == "نام تازه"


def test_me_rejects_invalid_names(client: TestClient, customer_headers) -> None:
    for name in ("a", "   ", ""):
        response = client.patch("/api/v1/me", headers=customer_headers, json={"name": name})
        assert response.status_code == 422
        assert response.json()["error"]["code"] == "validation_error"

    extra = client.patch(
        "/api/v1/me",
        headers=customer_headers,
        json={"name": "نام درست", "phone": "09121111111"},
    )
    assert extra.status_code == 422


def test_me_requires_a_customer_token(client: TestClient, admin_headers) -> None:
    missing = client.get("/api/v1/me")
    assert missing.status_code == 401
    assert missing.json()["error"]["code"] == "unauthorized"

    admin = client.get("/api/v1/me", headers=admin_headers)
    assert admin.status_code == 401
    assert admin.json()["error"]["code"] == "unauthorized"

    bookings = client.get("/api/v1/me/bookings", headers=admin_headers)
    assert bookings.status_code == 401


def test_a_customer_token_cannot_open_the_admin_panel(
    client: TestClient, customer_headers
) -> None:
    response = client.get("/api/v1/admin/services", headers=customer_headers)
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "unauthorized"

    admin_bookings = client.get("/api/v1/admin/bookings", headers=customer_headers)
    assert admin_bookings.status_code == 401


def test_my_bookings_scopes_and_can_cancel(
    client: TestClient,
    customer_headers,
    customer_user: User,
    db_session: Session,
) -> None:
    _add_booking(db_session, customer_user, "100001", "2026-10-19", "11:00")
    _add_booking(db_session, customer_user, "100002", TOMORROW, "10:00")
    _add_booking(db_session, customer_user, "100003", "2026-10-21", "12:00", "confirmed")
    _add_booking(db_session, customer_user, "100004", "2026-10-18", "10:00", "cancelled")
    _add_booking(db_session, customer_user, "100005", "2026-10-22", "10:00", "completed")

    all_items = client.get("/api/v1/me/bookings", headers=customer_headers).json()
    assert [item["code"] for item in all_items] == [
        "100005",
        "100003",
        "100002",
        "100001",
        "100004",
    ]
    assert set(all_items[0]) == {
        "code",
        "status",
        "service",
        "date",
        "time",
        "name",
        "price_at_booking",
        "can_cancel",
        "created_at",
    }
    assert all_items[0]["service"] == {"id": "beard", "label": "اصلاح و مدل ریش"}

    upcoming = client.get(
        "/api/v1/me/bookings", headers=customer_headers, params={"scope": "upcoming"}
    ).json()
    assert [item["code"] for item in upcoming] == ["100001", "100002", "100003"]
    assert [item["can_cancel"] for item in upcoming] == [False, True, True]

    past = client.get(
        "/api/v1/me/bookings", headers=customer_headers, params={"scope": "past"}
    ).json()
    assert [item["code"] for item in past] == ["100005", "100004"]
    assert all(item["can_cancel"] is False for item in past)

    invalid = client.get(
        "/api/v1/me/bookings", headers=customer_headers, params={"scope": "today"}
    )
    assert invalid.status_code == 422


def test_cancel_own_booking_moves_it_to_past(
    client: TestClient,
    customer_headers,
    customer_user: User,
    db_session: Session,
    sms_spy: SpySmsProvider,
) -> None:
    booking = _add_booking(db_session, customer_user, "200001", TOMORROW)
    response = client.post(
        f"/api/v1/me/bookings/{booking.code}/cancel", headers=customer_headers
    )
    assert response.status_code == 200
    assert response.json()["status"] == "cancelled"
    assert response.json()["can_cancel"] is False
    assert len(sms_spy.messages) == 1
    assert "لغو شد" in sms_spy.last_message[1]

    upcoming = client.get(
        "/api/v1/me/bookings", headers=customer_headers, params={"scope": "upcoming"}
    ).json()
    assert upcoming == []
    past = client.get(
        "/api/v1/me/bookings", headers=customer_headers, params={"scope": "past"}
    ).json()
    assert [item["code"] for item in past] == [booking.code]


def test_cancel_another_users_booking_returns_404(
    client: TestClient,
    customer_headers,
    customer_user: User,
    db_session: Session,
) -> None:
    other = make_customer(db_session, phone="09121111111", name="کاربر دیگر")
    booking = _add_booking(db_session, other, "200002", TOMORROW, "11:00")
    response = client.post(
        f"/api/v1/me/bookings/{booking.code}/cancel", headers=customer_headers
    )
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "booking_not_found"


def test_cancel_too_late_returns_409(
    client: TestClient,
    customer_headers,
    customer_user: User,
    db_session: Session,
) -> None:
    booking = _add_booking(db_session, customer_user, "200003", "2026-10-19", "11:00")
    response = client.post(
        f"/api/v1/me/bookings/{booking.code}/cancel", headers=customer_headers
    )
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "cancel_not_allowed"


def test_unknown_account_booking_returns_404(client: TestClient, customer_headers) -> None:
    response = client.post("/api/v1/me/bookings/999999/cancel", headers=customer_headers)
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "booking_not_found"


def test_admin_booking_links_to_an_existing_user(
    client: TestClient,
    admin_headers,
    customer_user: User,
    db_session: Session,
) -> None:
    response = client.post(
        "/api/v1/admin/bookings",
        headers=admin_headers,
        json={
            "service_id": "beard",
            "date": TOMORROW,
            "time": "17:00",
            "name": customer_user.name,
            "phone": customer_user.phone,
            "status": "pending",
        },
    )
    assert response.status_code == 201
    booking = db_session.scalars(
        select(Booking).where(Booking.code == response.json()["code"])
    ).one()
    assert booking.user_id == customer_user.id
