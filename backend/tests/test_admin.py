"""Tests for the admin API."""

from __future__ import annotations

from datetime import date

from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.booking import Booking, BookingStatus
from app.models.service import Service

ADMIN_HEADERS = {"Authorization": "Bearer invalid-token"}


def _add_booking(
    db_session: Session,
    code: str,
    day: str,
    slot: str = "10:00",
    status: str = BookingStatus.PENDING.value,
    name: str = "علی رضایی",
    phone: str = "09121234567",
) -> Booking:
    service = db_session.scalars(select(Service)).first()
    assert service is not None
    booking = Booking(
        code=code,
        service_id=service.id,
        date=date.fromisoformat(day),
        time=slot,
        customer_name=name,
        phone=phone,
        status=status,
        price_at_booking=service.price,
    )
    db_session.add(booking)
    db_session.commit()
    return booking


def test_login_returns_a_token(client: TestClient) -> None:
    response = client.post(
        "/api/v1/admin/login", json={"username": "admin", "password": "change-me-now"}
    )
    assert response.status_code == 200
    body = response.json()
    assert body["token_type"] == "bearer"
    assert body["expires_in"] == 43200
    assert body["access_token"]

    # The token opens the protected routes.
    authorized = client.get(
        "/api/v1/admin/services", headers={"Authorization": f"Bearer {body['access_token']}"}
    )
    assert authorized.status_code == 200
    assert isinstance(authorized.json(), list)


def test_login_with_a_wrong_password_returns_401(client: TestClient) -> None:
    response = client.post("/api/v1/admin/login", json={"username": "admin", "password": "wrong"})
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "invalid_credentials"


def test_login_with_a_wrong_username_returns_401(client: TestClient) -> None:
    response = client.post(
        "/api/v1/admin/login", json={"username": "nobody", "password": "change-me-now"}
    )
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "invalid_credentials"


def test_protected_route_without_a_token_returns_401(client: TestClient) -> None:
    response = client.get("/api/v1/admin/services")
    assert response.status_code == 401
    body = response.json()
    assert body["error"]["code"] == "unauthorized"
    assert set(body["error"]) == {"code", "message", "details"}


def test_protected_route_with_an_invalid_token_returns_401(client: TestClient) -> None:
    response = client.get("/api/v1/admin/services", headers=ADMIN_HEADERS)
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "unauthorized"


def test_admin_can_list_all_services(
    client: TestClient, admin_headers, db_session: Session
) -> None:
    db_session.add(
        Service(
            slug="hidden",
            label="خدمت غیرفعال",
            description="توضیح",
            price=100000,
            duration_minutes=20,
            includes=[],
            featured=False,
            is_active=False,
            sort_order=99,
        )
    )
    db_session.commit()

    response = client.get("/api/v1/admin/services", headers=admin_headers)
    assert response.status_code == 200
    items = response.json()
    assert len(items) == 7
    assert any(item["slug"] == "hidden" and item["is_active"] is False for item in items)
    assert items[0]["slug"] == "haircut"


def test_admin_can_create_a_service(client: TestClient, admin_headers) -> None:
    response = client.post(
        "/api/v1/admin/services",
        headers=admin_headers,
        json={
            "slug": "kids-cut",
            "label": "کوتاهی کودک",
            "description": "کوتاهی موی کودکان",
            "price": 250000,
            "duration_minutes": 30,
            "includes": ["شست‌وشو", "کوتاهی"],
            "featured": False,
            "is_active": True,
            "sort_order": 7,
        },
    )
    assert response.status_code == 201
    body = response.json()
    assert body["slug"] == "kids-cut"
    assert body["id"] > 0
    assert body["includes"] == ["شست‌وشو", "کوتاهی"]


def test_creating_a_service_with_a_duplicate_slug_returns_409(
    client: TestClient, admin_headers
) -> None:
    response = client.post(
        "/api/v1/admin/services",
        headers=admin_headers,
        json={
            "slug": "haircut",
            "label": "کوتاهی مو",
            "description": "توضیح",
            "price": 1000,
            "duration_minutes": 10,
        },
    )
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "already_exists"


def test_creating_a_service_with_an_invalid_slug_returns_422(
    client: TestClient, admin_headers
) -> None:
    response = client.post(
        "/api/v1/admin/services",
        headers=admin_headers,
        json={
            "slug": "Hair Cut!",
            "label": "کوتاهی مو",
            "description": "توضیح",
            "price": 1000,
            "duration_minutes": 10,
        },
    )
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "validation_error"


def test_admin_can_update_a_service(client: TestClient, admin_headers) -> None:
    service = client.get("/api/v1/admin/services", headers=admin_headers).json()[0]
    response = client.patch(
        f"/api/v1/admin/services/{service['id']}",
        headers=admin_headers,
        json={"price": 450000, "featured": True},
    )
    assert response.status_code == 200
    assert response.json()["price"] == 450000
    assert response.json()["featured"] is True
    assert response.json()["slug"] == "haircut"


def test_the_slug_of_a_service_is_immutable(client: TestClient, admin_headers) -> None:
    service = client.get("/api/v1/admin/services", headers=admin_headers).json()[0]
    response = client.patch(
        f"/api/v1/admin/services/{service['id']}",
        headers=admin_headers,
        json={"slug": "other"},
    )
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "validation_error"


def test_updating_an_unknown_service_returns_404(client: TestClient, admin_headers) -> None:
    response = client.patch(
        "/api/v1/admin/services/9999", headers=admin_headers, json={"price": 1000}
    )
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "service_not_found"


def test_deleting_a_service_soft_deletes_it(client: TestClient, admin_headers) -> None:
    service = client.get("/api/v1/admin/services", headers=admin_headers).json()[0]
    response = client.delete(f"/api/v1/admin/services/{service['id']}", headers=admin_headers)
    assert response.status_code == 200
    assert response.json()["is_active"] is False

    public = client.get("/api/v1/services").json()
    assert all(item["id"] != service["slug"] for item in public)


def test_admin_booking_list_shape(client: TestClient, admin_headers, db_session: Session) -> None:
    _add_booking(db_session, "111111", "2026-10-20", "11:00")
    _add_booking(db_session, "222222", "2026-10-20", "10:00")

    response = client.get("/api/v1/admin/bookings", headers=admin_headers)
    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 2
    assert body["page"] == 1
    assert body["page_size"] == 20
    item = body["items"][0]
    assert set(item) == {
        "id",
        "code",
        "status",
        "service",
        "date",
        "time",
        "name",
        "phone",
        "price_at_booking",
        "admin_note",
        "created_at",
    }
    assert item["service"]["id"] == "haircut"
    assert item["service"]["label"] == "کوتاهی مو"
    assert item["time"] == "10:00"


def test_admin_booking_list_is_sorted_by_date_and_time(
    client: TestClient, admin_headers, db_session: Session
) -> None:
    _add_booking(db_session, "111111", "2026-10-21", "12:00")
    _add_booking(db_session, "222222", "2026-10-20", "18:00")
    _add_booking(db_session, "333333", "2026-10-20", "09:00")

    items = client.get("/api/v1/admin/bookings", headers=admin_headers).json()["items"]
    assert [(item["date"], item["time"]) for item in items] == [
        ("2026-10-20", "09:00"),
        ("2026-10-20", "18:00"),
        ("2026-10-21", "12:00"),
    ]


def test_admin_booking_list_filters(client: TestClient, admin_headers, db_session: Session) -> None:
    _add_booking(db_session, "111111", "2026-10-20", "10:00", name="مشتری ویژه")
    _add_booking(db_session, "222222", "2026-10-21", "11:00", phone="09121111111")
    _add_booking(
        db_session,
        "333333",
        "2026-10-22",
        "12:00",
        status=BookingStatus.CONFIRMED.value,
    )

    by_date = client.get(
        "/api/v1/admin/bookings", headers=admin_headers, params={"date": "2026-10-20"}
    ).json()
    assert by_date["total"] == 1
    assert by_date["items"][0]["code"] == "111111"

    by_range = client.get(
        "/api/v1/admin/bookings",
        headers=admin_headers,
        params={"date_from": "2026-10-20", "date_to": "2026-10-21"},
    ).json()
    assert by_range["total"] == 2

    by_status = client.get(
        "/api/v1/admin/bookings", headers=admin_headers, params={"status": "confirmed"}
    ).json()
    assert by_status["total"] == 1
    assert by_status["items"][0]["code"] == "333333"

    by_name = client.get(
        "/api/v1/admin/bookings", headers=admin_headers, params={"q": "ویژه"}
    ).json()
    assert by_name["total"] == 1
    assert by_name["items"][0]["code"] == "111111"

    by_phone = client.get(
        "/api/v1/admin/bookings", headers=admin_headers, params={"q": "09121111111"}
    ).json()
    assert by_phone["total"] == 1

    by_code = client.get(
        "/api/v1/admin/bookings", headers=admin_headers, params={"q": "333333"}
    ).json()
    assert by_code["total"] == 1


def test_admin_booking_list_pagination(
    client: TestClient, admin_headers, db_session: Session
) -> None:
    for index in range(5):
        _add_booking(db_session, f"40000{index}", "2026-10-20", f"1{index}:00")

    first_page = client.get(
        "/api/v1/admin/bookings", headers=admin_headers, params={"page": 1, "page_size": 2}
    ).json()
    assert first_page["total"] == 5
    assert first_page["page"] == 1
    assert first_page["page_size"] == 2
    assert len(first_page["items"]) == 2

    last_page = client.get(
        "/api/v1/admin/bookings", headers=admin_headers, params={"page": 3, "page_size": 2}
    ).json()
    assert len(last_page["items"]) == 1


def test_admin_booking_list_rejects_a_page_size_above_the_maximum(
    client: TestClient, admin_headers
) -> None:
    response = client.get(
        "/api/v1/admin/bookings", headers=admin_headers, params={"page_size": 101}
    )
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "validation_error"


def test_admin_can_confirm_a_booking(
    client: TestClient, admin_headers, db_session: Session
) -> None:
    booking = _add_booking(db_session, "555555", "2026-10-20")
    response = client.patch(
        f"/api/v1/admin/bookings/{booking.id}",
        headers=admin_headers,
        json={"status": "confirmed", "admin_note": "مشتری تأیید کرد"},
    )
    assert response.status_code == 200
    assert response.json()["status"] == "confirmed"
    assert response.json()["admin_note"] == "مشتری تأیید کرد"


def test_admin_can_complete_a_confirmed_booking(
    client: TestClient, admin_headers, db_session: Session
) -> None:
    booking = _add_booking(db_session, "555556", "2026-10-20", status=BookingStatus.CONFIRMED.value)
    response = client.patch(
        f"/api/v1/admin/bookings/{booking.id}", headers=admin_headers, json={"status": "completed"}
    )
    assert response.status_code == 200
    assert response.json()["status"] == "completed"


def test_admin_cannot_skip_the_confirmed_step(
    client: TestClient, admin_headers, db_session: Session
) -> None:
    booking = _add_booking(db_session, "555557", "2026-10-20")
    response = client.patch(
        f"/api/v1/admin/bookings/{booking.id}", headers=admin_headers, json={"status": "completed"}
    )
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "invalid_status_transition"


def test_admin_cannot_reactivate_a_cancelled_booking(
    client: TestClient, admin_headers, db_session: Session
) -> None:
    booking = _add_booking(db_session, "555558", "2026-10-20", status=BookingStatus.CANCELLED.value)
    response = client.patch(
        f"/api/v1/admin/bookings/{booking.id}", headers=admin_headers, json={"status": "pending"}
    )
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "invalid_status_transition"


def test_admin_can_update_the_admin_note_only(
    client: TestClient, admin_headers, db_session: Session
) -> None:
    booking = _add_booking(db_session, "555559", "2026-10-20")
    response = client.patch(
        f"/api/v1/admin/bookings/{booking.id}",
        headers=admin_headers,
        json={"admin_note": "تماس گرفته شد"},
    )
    assert response.status_code == 200
    assert response.json()["status"] == "pending"
    assert response.json()["admin_note"] == "تماس گرفته شد"


def test_updating_an_unknown_booking_returns_404(client: TestClient, admin_headers) -> None:
    response = client.patch(
        "/api/v1/admin/bookings/9999", headers=admin_headers, json={"status": "confirmed"}
    )
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "booking_not_found"


def test_admin_can_read_the_settings(client: TestClient, admin_headers) -> None:
    response = client.get("/api/v1/admin/settings", headers=admin_headers)
    assert response.status_code == 200
    body = response.json()
    assert body["open_hour"] == 10
    assert body["close_hour"] == 21
    assert body["closed_weekdays"] == [4]
    assert body["booking_window_days"] == 14
    assert body["cancel_before_hours"] == 2
    assert body["max_active_bookings_per_phone"] == 3


def test_admin_settings_update_changes_the_availability(client: TestClient, admin_headers) -> None:
    response = client.put(
        "/api/v1/admin/settings", headers=admin_headers, json={"open_hour": 12, "close_hour": 15}
    )
    assert response.status_code == 200
    assert response.json()["open_hour"] == 12

    days = client.get("/api/v1/availability", params={"days": 1}).json()["days"]
    slots = [slot["time"] for slot in days[0]["slots"]]
    assert slots == ["12:00", "13:00", "14:00"]


def test_admin_settings_update_rejects_invalid_hours(client: TestClient, admin_headers) -> None:
    response = client.put(
        "/api/v1/admin/settings", headers=admin_headers, json={"open_hour": 20, "close_hour": 10}
    )
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "invalid_settings"


def test_admin_settings_update_rejects_invalid_weekdays(client: TestClient, admin_headers) -> None:
    response = client.put(
        "/api/v1/admin/settings", headers=admin_headers, json={"closed_weekdays": [9]}
    )
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "validation_error"


def test_admin_can_manage_closed_dates(client: TestClient, admin_headers) -> None:
    created = client.post(
        "/api/v1/admin/closed-dates",
        headers=admin_headers,
        json={"date": "2026-10-24", "reason": "تعطیل رسمی"},
    )
    assert created.status_code == 201
    closed_date_id = created.json()["id"]
    assert created.json()["date"] == "2026-10-24"

    listing = client.get("/api/v1/admin/closed-dates", headers=admin_headers).json()
    assert len(listing) == 1

    days = client.get("/api/v1/availability", params={"start": "2026-10-24", "days": 1}).json()
    assert days["days"][0]["closed"] is True

    deleted = client.delete(f"/api/v1/admin/closed-dates/{closed_date_id}", headers=admin_headers)
    assert deleted.status_code == 204

    days = client.get("/api/v1/availability", params={"start": "2026-10-24", "days": 1}).json()
    assert days["days"][0]["closed"] is False


def test_adding_a_duplicate_closed_date_returns_409(client: TestClient, admin_headers) -> None:
    payload = {"date": "2026-10-24", "reason": "تعطیل"}
    assert (
        client.post("/api/v1/admin/closed-dates", headers=admin_headers, json=payload).status_code
        == 201
    )
    duplicate = client.post("/api/v1/admin/closed-dates", headers=admin_headers, json=payload)
    assert duplicate.status_code == 409
    assert duplicate.json()["error"]["code"] == "already_exists"


def test_deleting_an_unknown_closed_date_returns_404(client: TestClient, admin_headers) -> None:
    response = client.delete("/api/v1/admin/closed-dates/9999", headers=admin_headers)
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "closed_date_not_found"


def test_admin_stats_summary(client: TestClient, admin_headers, db_session: Session) -> None:
    _add_booking(db_session, "600001", "2026-10-19", "10:00")
    _add_booking(db_session, "600002", "2026-10-19", "11:00")
    _add_booking(db_session, "600003", "2026-10-20", "12:00")
    _add_booking(db_session, "600004", "2026-10-22", "13:00")
    _add_booking(
        db_session,
        "600005",
        "2026-10-05",
        "14:00",
        status=BookingStatus.COMPLETED.value,
    )

    response = client.get("/api/v1/admin/stats/summary", headers=admin_headers)
    assert response.status_code == 200
    body = response.json()
    assert body["today_bookings"] == 2
    assert body["upcoming_bookings"] == 2
    assert body["revenue_completed_this_month"] == 400000


def test_admin_errors_use_the_unified_envelope(client: TestClient, admin_headers) -> None:
    responses = [
        client.get("/api/v1/admin/services"),
        client.patch("/api/v1/admin/services/9999", headers=admin_headers, json={"price": 1000}),
        client.put("/api/v1/admin/settings", headers=admin_headers, json={"open_hour": 30}),
    ]
    for response in responses:
        body = response.json()
        assert set(body) == {"error"}
        assert set(body["error"]) == {"code", "message", "details"}
        assert body["error"]["message"]

    ok = client.get("/api/v1/admin/services", headers=admin_headers)
    assert ok.status_code == 200
    assert isinstance(ok.json(), list)
