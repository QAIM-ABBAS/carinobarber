"""Hardening tests: CORS, request ids, production secret checks and the error envelope."""

from __future__ import annotations

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.core.config import DEFAULT_ADMIN_PASSWORD, DEFAULT_SECRET_KEY, Settings
from app.core.errors import register_exception_handlers
from app.core.middleware import mask_sensitive_query
from app.core.security import (
    create_access_token,
    create_customer_token,
    decode_access_token,
    decode_token,
    hash_password,
)

PRODUCTION_SECRETS = {
    "secret_key": "a-very-long-and-random-secret-key-for-tests-1234567890",
    "admin_password": "a-strong-admin-password",
}


def test_cors_allows_the_configured_origin(client: TestClient) -> None:
    response = client.get("/api/v1/services", headers={"Origin": "http://testserver"})
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://testserver"


def test_cors_preflight_is_answered(client: TestClient) -> None:
    response = client.options(
        "/api/v1/bookings",
        headers={
            "Origin": "http://testserver",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type",
        },
    )
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://testserver"


def test_cors_does_not_allow_an_unknown_origin(client: TestClient) -> None:
    response = client.get("/api/v1/services", headers={"Origin": "http://evil.example"})
    assert "access-control-allow-origin" not in response.headers


def test_every_response_carries_a_request_id(client: TestClient) -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.headers["x-request-id"]


def test_an_incoming_request_id_is_kept(client: TestClient) -> None:
    response = client.get("/health", headers={"X-Request-ID": "trace-123"})
    assert response.headers["x-request-id"] == "trace-123"


def test_error_responses_also_carry_the_request_id(client: TestClient) -> None:
    response = client.get("/api/v1/unknown", headers={"X-Request-ID": "trace-456"})
    assert response.status_code == 404
    assert response.headers["x-request-id"] == "trace-456"


def test_sensitive_query_parameters_are_masked() -> None:
    masked = mask_sensitive_query(
        '127.0.0.1:5000 - "GET /api/v1/bookings/123456?phone=09121234567 HTTP/1.1" 200'
    )
    assert "09121234567" not in masked
    assert "0912***4567" in masked


def test_passwords_are_masked() -> None:
    masked = mask_sensitive_query('"POST /admin/login?password=supersecret HTTP/1.1"')
    assert "supersecret" not in masked
    assert "password=***" in masked


def test_production_refuses_the_default_secret_key() -> None:
    settings = Settings(app_env="production", secret_key=DEFAULT_SECRET_KEY)
    with pytest.raises(RuntimeError, match="SECRET_KEY"):
        settings.validate_or_raise()


def test_production_refuses_a_short_secret_key() -> None:
    settings = Settings(app_env="production", secret_key="too-short")
    with pytest.raises(RuntimeError, match="SECRET_KEY"):
        settings.validate_or_raise()


def test_production_refuses_the_default_admin_password() -> None:
    settings = Settings(
        app_env="production",
        secret_key=PRODUCTION_SECRETS["secret_key"],
        admin_password=DEFAULT_ADMIN_PASSWORD,
    )
    with pytest.raises(RuntimeError, match="ADMIN_PASSWORD"):
        settings.validate_or_raise()


def test_production_accepts_strong_secrets() -> None:
    settings = Settings(app_env="production", **PRODUCTION_SECRETS)
    settings.validate_or_raise()


def test_development_allows_the_default_secrets() -> None:
    Settings(app_env="development").validate_or_raise()


def test_an_unknown_sms_provider_is_refused() -> None:
    settings = Settings(app_env="development", sms_provider="kavenegar")
    with pytest.raises(RuntimeError, match="SMS_PROVIDER"):
        settings.validate_or_raise()


def test_an_invalid_timezone_is_refused() -> None:
    settings = Settings(app_env="development", shop_timezone="Mars/Olympus")
    with pytest.raises(RuntimeError, match="SHOP_TIMEZONE"):
        settings.validate_or_raise()


def test_passwords_are_hashed_with_bcrypt() -> None:
    password_hash = hash_password("change-me-now")
    assert password_hash != "change-me-now"
    assert password_hash.startswith("$2")


def test_a_token_round_trip_returns_the_subject() -> None:
    token, expires_in = create_access_token("admin")
    assert expires_in == 720 * 60
    assert decode_access_token(token) == "admin"
    payload = decode_token(token)
    assert payload is not None
    assert payload.role == "admin"


def test_a_customer_token_has_the_customer_role() -> None:
    token, expires_in = create_customer_token(42)
    assert expires_in == 30 * 24 * 60 * 60
    payload = decode_token(token)
    assert payload is not None
    assert payload.role == "customer"
    assert payload.subject == "42"


def test_a_tampered_token_is_rejected() -> None:
    token, _ = create_access_token("admin")
    assert decode_access_token(token + "x") is None
    assert decode_access_token("not-a-token") is None


def test_unhandled_errors_use_the_unified_envelope() -> None:
    app = FastAPI()
    register_exception_handlers(app)

    @app.get("/boom")
    def boom() -> None:
        raise RuntimeError("boom")

    with TestClient(app, raise_server_exceptions=False) as client:
        response = client.get("/boom")
    assert response.status_code == 500
    body = response.json()
    assert set(body) == {"error"}
    assert body["error"]["code"] == "internal_error"
    assert body["error"]["message"]
    assert body["error"]["details"] is None


def test_method_not_allowed_uses_the_unified_envelope(client: TestClient) -> None:
    response = client.delete("/api/v1/services")
    assert response.status_code == 405
    body = response.json()
    assert body["error"]["code"] == "method_not_allowed"
    assert body["error"]["message"]


def test_malformed_json_uses_the_unified_envelope(
    client: TestClient, customer_headers
) -> None:
    response = client.post(
        "/api/v1/bookings",
        content="{not-json",
        headers={"Content-Type": "application/json", **customer_headers},
    )
    assert response.status_code == 422
    body = response.json()
    assert body["error"]["code"] == "validation_error"
    assert body["error"]["details"]
