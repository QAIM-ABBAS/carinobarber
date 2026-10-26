"""Tests for OTP cooldowns, hourly caps, IP limits and invalidation."""

from __future__ import annotations

from datetime import timedelta

from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.otp_code import OtpCode
from tests.helpers import FIXED_NOW

PHONE = "09121234567"


def _request(client: TestClient, phone: str = PHONE):
    return client.post("/api/v1/auth/otp/request", json={"phone": phone})


def _verify(client: TestClient, code: str, phone: str = PHONE):
    return client.post(
        "/api/v1/auth/otp/verify",
        json={"phone": phone, "code": code, "name": "علی رضایی"},
    )


def test_resend_cooldown_returns_retry_after(client: TestClient) -> None:
    first = _request(client)
    assert first.status_code == 200

    blocked = _request(client)
    assert blocked.status_code == 429
    body = blocked.json()["error"]
    assert body["code"] == "otp_rate_limited"
    assert body["details"] == {"retry_after": 60}


def test_a_new_request_is_allowed_after_the_cooldown(
    client: TestClient, set_now, db_session: Session, monkeypatch
) -> None:
    codes = iter(("111111", "222222"))
    monkeypatch.setattr("app.services.otp.generate_otp_code", lambda: next(codes))
    first = _request(client)
    set_now(FIXED_NOW + timedelta(seconds=61))
    second = _request(client)
    assert second.status_code == 200
    assert second.json()["dev_code"] != first.json()["dev_code"]

    old = db_session.scalars(select(OtpCode).order_by(OtpCode.id)).first()
    assert old is not None
    assert old.consumed_at is not None


def test_hourly_cap_is_enforced(client: TestClient, set_now) -> None:
    for index in range(5):
        set_now(FIXED_NOW + timedelta(seconds=61 * index))
        allowed = _request(client)
        assert allowed.status_code == 200

    set_now(FIXED_NOW + timedelta(seconds=61 * 5))
    blocked = _request(client)
    assert blocked.status_code == 429
    body = blocked.json()["error"]
    assert body["code"] == "otp_rate_limited"
    retry_after = body["details"]["retry_after"]
    assert 0 < retry_after <= 3600


def test_per_ip_limit_is_ten_requests_per_minute(client: TestClient) -> None:
    for index in range(10):
        response = _request(client, phone=f"0912{1_000_000 + index:07d}")
        assert response.status_code == 200

    blocked = _request(client, phone="09129999999")
    assert blocked.status_code == 429
    body = blocked.json()["error"]
    assert body["code"] == "otp_rate_limited"
    assert body["details"]["retry_after"] > 0


def test_a_new_code_invalidates_the_previous_one(
    client: TestClient, set_now, db_session: Session, monkeypatch
) -> None:
    codes = iter(("333333", "444444"))
    monkeypatch.setattr("app.services.otp.generate_otp_code", lambda: next(codes))
    first_code = _request(client).json()["dev_code"]
    set_now(FIXED_NOW + timedelta(seconds=61))
    second_code = _request(client).json()["dev_code"]

    old = _verify(client, first_code)
    assert old.status_code == 400
    assert old.json()["error"]["code"] == "otp_invalid"

    current = _verify(client, second_code)
    assert current.status_code == 200


def test_old_otp_rows_are_deleted_on_request(
    client: TestClient, db_session: Session
) -> None:
    db_session.add(
        OtpCode(
            phone="09121111111",
            code_hash="0" * 64,
            expires_at=FIXED_NOW - timedelta(days=2),
            created_at=FIXED_NOW - timedelta(days=2),
        )
    )
    db_session.commit()

    assert _request(client).status_code == 200
    remaining = db_session.scalars(
        select(OtpCode).where(OtpCode.phone == "09121111111")
    ).all()
    assert remaining == []
