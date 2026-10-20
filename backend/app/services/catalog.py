"""Read only queries for the public service catalog."""

from __future__ import annotations

from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.service import Service


@dataclass(frozen=True)
class ServiceInfo:
    """A service as used by the public API."""

    id: str
    label: str
    description: str
    price: int
    duration_minutes: int
    includes: list[str]
    featured: bool


def list_active_services(session: Session) -> list[ServiceInfo]:
    """Return the active services ordered by ``sort_order``."""
    services = session.scalars(
        select(Service).where(Service.is_active.is_(True)).order_by(Service.sort_order, Service.id)
    ).all()
    return [
        ServiceInfo(
            id=service.slug,
            label=service.label,
            description=service.description,
            price=service.price,
            duration_minutes=service.duration_minutes,
            includes=list(service.includes or []),
            featured=service.featured,
        )
        for service in services
    ]
