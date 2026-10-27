"""Tests for the phone based entry into the admin panel."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.core.config import Settings
from app.core.security import decode_token, is_admin_phone
from tests.helpers import ADMIN_NAME, ADMIN_PHONE, DEFAULT_CUSTOMER_PHONE


def _admin_headers(customer_headers_for_phone) -> dict[str, str]:
    return customer_headers_for_phone(ADMIN_PHONE, name=ADMIN_NAME)


def _exchange(client: TestClient, headers: dict[str, str]):
    return client.post("/api/v1/admin/session", headers=headers)


def test_me_marks_the_admin_phone(
    client: TestClient,
    customer_headers: dict[str, str],
    customer_headers_for_phone,
) -> None:
    customer = client.get("/api/v1/me", headers=customer_headers)
    assert customer.status_code == 200
    assert customer.json()["is_admin"] is False

    admin = client.get("/api/v1/me", headers=_admin_headers(customer_headers_for_phone))
    assert admin.status_code == 200
    assert admin.json()["is_admin"] is True


def test_the_exchange_requires_a_customer_token(
    client: TestClient,
    admin_headers: dict[str, str],
) -> None:
    missing = _exchange(client, {})
    assert missing.status_code == 401
    assert missing.json()["error"]["code"] == "unauthorized"

    # An admin token is not a customer session and cannot mint another one.
    admin_token = _exchange(client, admin_headers)
    assert admin_token.status_code == 401
    assert admin_token.json()["error"]["code"] == "unauthorized"


def test_a_non_admin_phone_gets_no_token(
    client: TestClient,
    customer_headers: dict[str, str],
) -> None:
    response = _exchange(client, customer_headers)
    assert response.status_code == 403
    body = response.json()
    assert body["error"]["code"] == "forbidden"
    assert body["error"]["message"] == "این حساب کاربری به پنل مدیریت دسترسی ندارد."
    assert "access_token" not in body

    # The same non-admin token still cannot open an admin endpoint.
    forbidden = client.get("/api/v1/admin/stats/summary", headers=customer_headers)
    assert forbidden.status_code == 401


def test_the_admin_phone_receives_a_working_admin_token(
    client: TestClient,
    customer_headers_for_phone,
) -> None:
    headers = _admin_headers(customer_headers_for_phone)
    response = _exchange(client, headers)
    assert response.status_code == 200

    body = response.json()
    assert body["token_type"] == "bearer"
    assert body["expires_in"] > 0
    payload = decode_token(body["access_token"])
    assert payload is not None
    assert payload.role == "admin"
    assert payload.subject == "admin"

    admin_headers = {"Authorization": f"Bearer {body['access_token']}"}
    stats = client.get("/api/v1/admin/stats/summary", headers=admin_headers)
    assert stats.status_code == 200

    # The admin token is not a customer token either.
    me = client.get("/api/v1/me", headers=admin_headers)
    assert me.status_code == 401


def test_every_phone_but_the_admin_phone_is_rejected(
    client: TestClient,
    customer_headers_for_phone,
) -> None:
    other_phones = ("09121111111", "09122222222", DEFAULT_CUSTOMER_PHONE)
    for phone in other_phones:
        response = _exchange(client, customer_headers_for_phone(phone))
        assert response.status_code == 403


def test_the_admin_phone_is_normalized_in_the_configuration() -> None:
    settings = Settings(admin_phone="۰۹۱۲۹۹۹۹۹۹۹")
    assert settings.admin_phone == ADMIN_PHONE
    assert is_admin_phone(ADMIN_PHONE, settings) is True


def test_an_empty_admin_phone_disables_the_phone_entry() -> None:
    settings = Settings(admin_phone="")
    assert settings.admin_phone == ""
    assert is_admin_phone(ADMIN_PHONE, settings) is False


def test_an_invalid_admin_phone_is_rejected() -> None:
    with pytest.raises(ValidationError):
        Settings(admin_phone="12345")
