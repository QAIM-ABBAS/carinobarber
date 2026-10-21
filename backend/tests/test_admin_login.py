"""Tests for the rate limit of the admin login."""

from __future__ import annotations

from fastapi.testclient import TestClient

CREDENTIALS = {"username": "admin", "password": "change-me-now"}


def _try_login(client: TestClient, password: str = "wrong") -> None:
    response = client.post("/api/v1/admin/login", json={"username": "admin", "password": password})
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "invalid_credentials"


def test_the_first_five_login_attempts_are_answered(client: TestClient) -> None:
    for _ in range(5):
        _try_login(client)


def test_the_sixth_login_attempt_is_rate_limited(client: TestClient) -> None:
    for _ in range(5):
        _try_login(client)

    response = client.post("/api/v1/admin/login", json=CREDENTIALS)
    assert response.status_code == 429
    body = response.json()
    assert body["error"]["code"] == "rate_limited"
    assert body["error"]["message"]


def test_the_limiter_counts_the_successful_attempts_too(client: TestClient) -> None:
    """Five failed attempts block the next one, even with the right password."""
    for _ in range(5):
        _try_login(client)

    response = client.post("/api/v1/admin/login", json=CREDENTIALS)
    assert response.status_code == 429
    assert response.json()["error"]["code"] == "rate_limited"


def test_a_correct_login_before_the_limit_returns_a_token(client: TestClient) -> None:
    _try_login(client)
    response = client.post("/api/v1/admin/login", json=CREDENTIALS)
    assert response.status_code == 200
    assert response.json()["access_token"]


def test_the_login_rate_limit_uses_the_unified_envelope(client: TestClient) -> None:
    for _ in range(5):
        _try_login(client)

    response = client.post("/api/v1/admin/login", json=CREDENTIALS)
    assert set(response.json()) == {"error"}
    assert set(response.json()["error"]) == {"code", "message", "details"}
