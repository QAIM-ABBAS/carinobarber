"""Validation and storage of the images uploaded for the services.

The files live outside the database: the ``services.images`` column only holds
their public URLs. Every upload is stored with a random file name so two files
with the same original name never collide.
"""

from __future__ import annotations

import logging
import uuid
from pathlib import Path

logger = logging.getLogger("gc.media")

#: The largest accepted image (5 MB). The API reads one extra byte to detect it.
MAX_IMAGE_BYTES = 5 * 1024 * 1024

#: How many images a single service may have.
MAX_IMAGES_PER_SERVICE = 12

#: The public prefix of the uploaded files (mounted by ``app.main``).
MEDIA_URL_PREFIX = "/api/v1/media/services"

_EXTENSIONS = ("jpg", "png", "webp")

PNG_SIGNATURE = b"\x89PNG\r\n\x1a\n"
JPEG_SIGNATURE = b"\xff\xd8\xff"
WEBP_RIFF = b"RIFF"
WEBP_SIGNATURE = b"WEBP"


def detect_image_extension(content: bytes) -> str | None:
    """Return the extension of a JPEG, PNG or WebP image.

    The type is detected from the magic bytes, not from the (spoofable) file
    name or the content type the client sent. ``None`` means "not an image".
    """
    if content.startswith(JPEG_SIGNATURE):
        return "jpg"
    if content.startswith(PNG_SIGNATURE):
        return "png"
    if len(content) >= 12 and content[:4] == WEBP_RIFF and content[8:12] == WEBP_SIGNATURE:
        return "webp"
    return None


def service_image_dir(upload_dir: Path) -> Path:
    """Return the folder of the service images, creating it when needed."""
    directory = Path(upload_dir) / "services"
    directory.mkdir(parents=True, exist_ok=True)
    return directory


def save_service_image(upload_dir: Path, content: bytes, extension: str) -> str:
    """Write an image to disk and return its public URL."""
    if extension not in _EXTENSIONS:  # pragma: no cover - guarded by the caller
        raise ValueError(f"Unsupported image extension: {extension!r}")
    filename = f"{uuid.uuid4().hex}.{extension}"
    (service_image_dir(upload_dir) / filename).write_bytes(content)
    return f"{MEDIA_URL_PREFIX}/{filename}"


def delete_service_image_file(upload_dir: Path, image_url: str) -> None:
    """Delete the file behind :func:`save_service_image`.

    A missing file is not an error (the database is the source of truth). A
    failure to remove the file is logged instead of failing the request.
    """
    filename = Path(image_url).name
    try:
        (service_image_dir(upload_dir) / filename).unlink(missing_ok=True)
    except OSError as exc:  # pragma: no cover - depends on the file system
        logger.warning("Could not delete service image %s: %s", filename, exc)
