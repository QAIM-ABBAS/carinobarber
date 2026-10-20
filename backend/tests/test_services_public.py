"""Tests for the public service catalog."""

from __future__ import annotations

from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.service import Service

EXPECTED_ORDER = ["haircut", "beard", "shave", "styling", "facial", "package"]


def test_services_returns_the_six_active_services_in_order(client: TestClient) -> None:
    response = client.get("/api/v1/services")
    assert response.status_code == 200
    items = response.json()
    assert [item["id"] for item in items] == EXPECTED_ORDER


def test_service_payload_uses_the_slug_as_id(client: TestClient) -> None:
    response = client.get("/api/v1/services")
    assert response.status_code == 200
    first = response.json()[0]
    assert set(first) == {
        "id",
        "label",
        "description",
        "price",
        "duration_minutes",
        "includes",
        "featured",
    }
    assert first == {
        "id": "haircut",
        "label": "کوتاهی مو",
        "description": (
            "کوتاهی متناسب با فرم صورت و بافت مو، با قیچی و ماشین؛ همراه با شست‌وشو و حالت‌دهی نهایی."
        ),
        "price": 400000,
        "duration_minutes": 45,
        "includes": ["شست‌وشو", "کوتاهی", "حالت‌دهی"],
        "featured": False,
    }


def test_only_the_package_is_featured(client: TestClient) -> None:
    items = client.get("/api/v1/services").json()
    assert [item["id"] for item in items if item["featured"]] == ["package"]


def test_inactive_services_are_hidden(client: TestClient, db_session: Session) -> None:
    db_session.add(
        Service(
            slug="hidden",
            label="خدمت غیرفعال",
            description="این خدمت نباید در خروجی بیاید.",
            price=100000,
            duration_minutes=15,
            includes=[],
            featured=False,
            is_active=False,
            sort_order=99,
        )
    )
    db_session.commit()

    items = client.get("/api/v1/services").json()
    assert [item["id"] for item in items] == EXPECTED_ORDER
    assert all(item["id"] != "hidden" for item in items)


def test_services_are_sorted_by_sort_order(client: TestClient, db_session: Session) -> None:
    haircut = db_session.scalars(select(Service).where(Service.slug == "haircut")).one()
    haircut.sort_order = 100
    db_session.commit()

    items = client.get("/api/v1/services").json()
    assert items[0]["id"] == "beard"
