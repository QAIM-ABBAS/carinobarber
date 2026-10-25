"""Tests for the service image gallery (upload, serving and deletion)."""

from __future__ import annotations

import base64
from pathlib import Path

from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import Settings
from app.models.service import Service
from app.services.media import MAX_IMAGE_BYTES, MAX_IMAGES_PER_SERVICE, MEDIA_URL_PREFIX

#: A valid 1x1 transparent PNG.
PNG_BYTES = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
)


def _service(client: TestClient, admin_headers: dict[str, str]) -> dict[str, object]:
    return client.get("/api/v1/admin/services", headers=admin_headers).json()[0]


def _upload(
    client: TestClient,
    admin_headers: dict[str, str],
    service_id: int,
    content: bytes = PNG_BYTES,
    filename: str = "cut.png",
    content_type: str = "image/png",
):
    return client.post(
        f"/api/v1/admin/services/{service_id}/images",
        headers=admin_headers,
        files={"file": (filename, content, content_type)},
    )


def test_admin_can_upload_serve_and_remove_service_images(
    client: TestClient,
    admin_headers: dict[str, str],
    db_session: Session,
    settings: Settings,
) -> None:
    service = _service(client, admin_headers)
    service_id = int(service["id"])

    first = _upload(client, admin_headers, service_id)
    assert first.status_code == 201
    first_image = first.json()["images"][0]
    assert first_image.startswith(f"{MEDIA_URL_PREFIX}/")
    assert first_image.endswith(".png")

    second = _upload(client, admin_headers, service_id, filename="another.png")
    assert second.status_code == 201
    images = second.json()["images"]
    assert len(images) == 2
    assert images[0] == first_image
    assert images[1] != first_image

    # The database is the source of truth and the public catalog exposes the URLs.
    stored = db_session.get(Service, service_id)
    assert stored is not None
    assert stored.images == images
    public = client.get("/api/v1/services").json()
    haircut = next(item for item in public if item["id"] == "haircut")
    assert haircut["images"] == images

    # The file is served below /api/v1/media.
    response = client.get(first_image)
    assert response.status_code == 200
    assert response.content == PNG_BYTES

    # Deleting removes the row from the gallery and the file from disk.
    filename = Path(first_image).name
    deleted = client.delete(
        f"/api/v1/admin/services/{service_id}/images/{filename}", headers=admin_headers
    )
    assert deleted.status_code == 200
    assert deleted.json()["images"] == [images[1]]
    assert client.get(first_image).status_code == 404
    assert not (Path(settings.upload_dir) / "services" / filename).exists()


def test_uploading_a_file_that_is_not_an_image_is_rejected(
    client: TestClient, admin_headers: dict[str, str]
) -> None:
    service = _service(client, admin_headers)
    response = _upload(
        client,
        admin_headers,
        int(service["id"]),
        content=b"this is not an image",
        filename="fake.png",
        content_type="image/png",
    )
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "invalid_image"


def test_uploading_an_oversized_image_is_rejected(
    client: TestClient, admin_headers: dict[str, str]
) -> None:
    service = _service(client, admin_headers)
    response = _upload(
        client,
        admin_headers,
        int(service["id"]),
        content=b"\x89PNG\r\n\x1a\n" + b"\x00" * MAX_IMAGE_BYTES,
    )
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "image_too_large"


def test_uploading_to_an_unknown_service_returns_404(
    client: TestClient, admin_headers: dict[str, str]
) -> None:
    response = _upload(client, admin_headers, 9999)
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "service_not_found"


def test_a_service_cannot_have_more_than_the_maximum_images(
    client: TestClient,
    admin_headers: dict[str, str],
    db_session: Session,
    settings: Settings,
) -> None:
    service = db_session.scalars(select(Service).where(Service.slug == "haircut")).one()
    service.images = [
        f"{MEDIA_URL_PREFIX}/{'a' * 32}.png" for _ in range(MAX_IMAGES_PER_SERVICE)
    ]
    db_session.commit()

    image_dir = Path(settings.upload_dir) / "services"
    files_before = set(image_dir.glob("*"))

    response = _upload(client, admin_headers, service.id)

    assert response.status_code == 400
    assert response.json()["error"]["code"] == "too_many_images"
    # The rejected upload must not leave an orphan file behind.
    assert set(image_dir.glob("*")) == files_before


def test_deleting_an_unknown_image_returns_404(
    client: TestClient, admin_headers: dict[str, str]
) -> None:
    service = _service(client, admin_headers)
    response = client.delete(
        f"/api/v1/admin/services/{service['id']}/images/{'0' * 32}.png",
        headers=admin_headers,
    )
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "image_not_found"


def test_service_images_require_authentication(client: TestClient) -> None:
    assert client.post("/api/v1/admin/services/1/images").status_code == 401
    assert client.delete(f"/api/v1/admin/services/1/images/{'0' * 32}.png").status_code == 401
