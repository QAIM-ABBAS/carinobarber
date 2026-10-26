"""Tests for OTP request, verification and customer login."""

from __future__ import annotations

import re
from datetime import date, timedelta

from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import Settings
from app.core.security import decode_token
from app.models.booking import Booking
from app.models.otp_code import OtpCode
from app.models.service import Service
from app.models.user import User
from app.services.otp import hash_otp_code
from tests.helpers import FIXED_NOW, SpySmsProvider

PHONE = "09121234567"
PERSIAN_DIGITS = str.maketrans("0123456789", "۰۱۲۳۴۵۶۷۸۹")


def _request(client: TestClient, phone: str = PHONE):
    return client.post("/api/v1/auth/otp/request", json={"phone": phone})


def _wrong(code: str) -> str:
    return f"{(int(code) + 1) % 1_000_000:06d}"


def _verify(client: TestClient, code: str, name: str | None = None, phone: str = PHONE):
    payload: dict[str, object] = {"phone": phone, "code": code}
    if name is not None:
        payload["name"] = name
    return client.post("/api/v1/auth/otp/verify", json=payload)


def test_request_stores_only_a_hashed_code(
    client: TestClient,
    db_session: Session,
    settings: Settings,
    sms_spy: SpySmsProvider,
) -> None:
    response = _request(client, phone="۰۹۱۲۱۲۳۴۵۶۷")
    assert response.status_code == 200
    body = response.json()
    assert body["expires_in"] == 120
    assert body["resend_after"] == 60
    assert body["is_new_user"] is True
    assert re.fullmatch(r"\d{6}", body["dev_code"])
    assert sms_spy.messages == []

    otp = db_session.scalars(select(OtpCode)).one()
    assert otp.phone == PHONE
    assert otp.code_hash == hash_otp_code(PHONE, body["dev_code"], settings.secret_key)
    assert otp.code_hash != body["dev_code"]
    assert len(otp.code_hash) == 64
    assert otp.attempts == 0
    assert otp.consumed_at is None
    assert otp.expires_at == FIXED_NOW + timedelta(seconds=120)


def test_dev_mode_false_never_returns_the_code_and_sends_sms(
    client: TestClient,
    app,
    sms_spy: SpySmsProvider,
    monkeypatch,
) -> None:
    monkeypatch.setattr(app.state.settings, "otp_dev_mode", False)
    response = _request(client)
    assert response.status_code == 200
    assert response.json()["dev_code"] is None
    assert len(sms_spy.messages) == 1
    phone, text = sms_spy.last_message
    assert phone == PHONE
    assert "کد ورود شما به باشگاه جنتلمن‌ها:" in text
    assert re.search(r"\d{6}", text)


def test_invalid_phone_returns_422(client: TestClient) -> None:
    response = _request(client, phone="12345")
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "invalid_phone"


def test_new_user_is_created_and_gets_a_customer_token(
    client: TestClient, db_session: Session
) -> None:
    code = _request(client).json()["dev_code"]
    response = _verify(client, code.translate(PERSIAN_DIGITS), name="  سارا احمدی  ")
    assert response.status_code == 200
    body = response.json()
    assert body["token_type"] == "bearer"
    assert body["expires_in"] == 30 * 24 * 60 * 60
    assert body["user"]["name"] == "سارا احمدی"
    assert body["user"]["phone"] == PHONE
    assert body["user"]["id"] > 0

    payload = decode_token(body["access_token"])
    assert payload is not None
    assert payload.role == "customer"
    assert payload.subject == str(body["user"]["id"])

    user = db_session.get(User, body["user"]["id"])
    assert user is not None
    assert user.last_login_at == FIXED_NOW
    otp = db_session.scalars(select(OtpCode)).one()
    assert otp.consumed_at == FIXED_NOW


def test_wrong_code_returns_the_attempts_left(
    client: TestClient, db_session: Session
) -> None:
    code = _request(client).json()["dev_code"]
    first = _verify(client, _wrong(code))
    assert first.status_code == 400
    assert first.json()["error"]["code"] == "otp_invalid"
    assert first.json()["error"]["details"] == {"attempts_left": 4}

    second = _verify(client, _wrong(code))
    assert second.status_code == 400
    assert second.json()["error"]["details"] == {"attempts_left": 3}
    otp = db_session.scalars(select(OtpCode)).one()
    assert otp.attempts == 2


def test_five_wrong_attempts_kill_the_code(
    client: TestClient, db_session: Session
) -> None:
    code = _request(client).json()["dev_code"]
    for expected_left in (4, 3, 2, 1):
        response = _verify(client, _wrong(code))
        assert response.status_code == 400
        assert response.json()["error"]["details"] == {"attempts_left": expected_left}

    killed = _verify(client, _wrong(code))
    assert killed.status_code == 429
    assert killed.json()["error"]["code"] == "otp_too_many_attempts"

    correct = _verify(client, code)
    assert correct.status_code == 429
    assert correct.json()["error"]["code"] == "otp_too_many_attempts"


def test_expired_code_returns_otp_expired(
    client: TestClient, set_now
) -> None:
    code = _request(client).json()["dev_code"]
    set_now(FIXED_NOW + timedelta(seconds=121))
    response = _verify(client, code)
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "otp_expired"


def test_a_code_is_single_use(client: TestClient) -> None:
    code = _request(client).json()["dev_code"]
    assert _verify(client, code, name="رضا کریمی").status_code == 200

    again = _verify(client, code, name="رضا کریمی")
    assert again.status_code == 400
    assert again.json()["error"]["code"] == "otp_expired"


def test_name_required_does_not_consume_the_code(
    client: TestClient, db_session: Session
) -> None:
    code = _request(client).json()["dev_code"]
    missing = _verify(client, code)
    assert missing.status_code == 422
    assert missing.json()["error"]["code"] == "name_required"

    otp = db_session.scalars(select(OtpCode)).one()
    assert otp.consumed_at is None
    assert otp.attempts == 0

    short = _verify(client, code, name="a")
    assert short.status_code == 422
    assert short.json()["error"]["code"] == "name_required"

    retried = _verify(client, code, name="مینا رضایی")
    assert retried.status_code == 200
    assert retried.json()["user"]["name"] == "مینا رضایی"


def test_existing_user_logs_in_without_a_name(
    client: TestClient, db_session: Session, customer_user: User
) -> None:
    response = _request(client)
    assert response.json()["is_new_user"] is False
    verified = _verify(client, response.json()["dev_code"])
    assert verified.status_code == 200
    assert verified.json()["user"]["id"] == customer_user.id
    assert verified.json()["user"]["name"] == customer_user.name

    db_session.refresh(customer_user)
    assert customer_user.last_login_at == FIXED_NOW


def test_old_bookings_of_the_phone_are_linked_on_login(
    client: TestClient, db_session: Session
) -> None:
    service = db_session.scalars(select(Service).where(Service.slug == "beard")).one()
    booking = Booking(
        code="777777",
        service_id=service.id,
        date=date(2026, 10, 20),
        time="10:00",
        customer_name="علی رضایی",
        phone=PHONE,
        status="pending",
        price_at_booking=service.price,
    )
    db_session.add(booking)
    db_session.commit()
    assert booking.user_id is None

    code = _request(client).json()["dev_code"]
    verified = _verify(client, code, name="علی رضایی")
    assert verified.status_code == 200
    db_session.refresh(booking)
    assert booking.user_id == verified.json()["user"]["id"]
