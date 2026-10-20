"""Idempotent seed data: the default service catalog and the shop settings row."""

from __future__ import annotations

from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.service import Service
from app.models.shop_settings import SETTINGS_ROW_ID, ShopSettings

SERVICES: tuple[dict[str, object], ...] = (
    {
        "slug": "haircut",
        "label": "کوتاهی مو",
        "description": (
            "کوتاهی متناسب با فرم صورت و بافت مو، با قیچی و ماشین؛ همراه با شست‌وشو و حالت‌دهی نهایی."
        ),
        "price": 400000,
        "duration_minutes": 45,
        "includes": ["شست‌وشو", "کوتاهی", "حالت‌دهی"],
        "featured": False,
        "is_active": True,
        "sort_order": 1,
    },
    {
        "slug": "beard",
        "label": "اصلاح و مدل ریش",
        "description": ("هم‌اندازه‌کردن و مدل‌دادن به ریش با خط‌ریش تمیز، حوله گرم و روغن مراقبتی."),
        "price": 350000,
        "duration_minutes": 30,
        "includes": ["حوله گرم", "خط‌ریش", "روغن ریش"],
        "featured": False,
        "is_active": True,
        "sort_order": 2,
    },
    {
        "slug": "shave",
        "label": "اصلاح با تیغ",
        "description": "اصلاح کلاسیک با تیغ و کف گرم؛ صاف، آرام و بدون سوزش.",
        "price": 300000,
        "duration_minutes": 30,
        "includes": ["بخور گرم", "کف اصلاح", "افترشیو"],
        "featured": False,
        "is_active": True,
        "sort_order": 3,
    },
    {
        "slug": "styling",
        "label": "حالت‌دهی مو",
        "description": ("حالت‌دهی مو برای مراسم یا استایل روزمره، با محصولات حرفه‌ای و سشوار."),
        "price": 500000,
        "duration_minutes": 30,
        "includes": ["سشوار", "واکس و پماد", "اسپری فیکس"],
        "featured": False,
        "is_active": True,
        "sort_order": 4,
    },
    {
        "slug": "facial",
        "label": "مراقبت از پوست",
        "description": "پاک‌سازی عمیق، لایه‌برداری و ماسک مخصوص آقایان برای پوستی شاداب‌تر.",
        "price": 600000,
        "duration_minutes": 40,
        "includes": ["پاک‌سازی", "لایه‌برداری", "ماسک"],
        "featured": False,
        "is_active": True,
        "sort_order": 5,
    },
    {
        "slug": "package",
        "label": "پکیج‌های آراستگی",
        "description": ("کوتاهی مو، مدل‌دهی ریش و اصلاح با تیغ در یک نوبت؛ تجربه کامل باشگاه."),
        "price": 750000,
        "duration_minutes": 90,
        "includes": ["کوتاهی مو", "مدل ریش", "اصلاح با تیغ", "مراقبت پوست"],
        "featured": True,
        "is_active": True,
        "sort_order": 6,
    },
)


@dataclass(frozen=True)
class SeedResult:
    """Summary of what the seed run changed."""

    services_created: int
    settings_created: bool


def seed_database(session: Session) -> SeedResult:
    """Insert missing services and the settings row.

    The function is idempotent: a service is only inserted when its slug is unknown and
    the settings row is only created when it does not exist yet.

    Args:
        session: an open SQLAlchemy session.

    Returns:
        A summary of the created rows.
    """
    known_slugs = set(session.scalars(select(Service.slug)).all())
    services_created = 0
    for payload in SERVICES:
        if payload["slug"] in known_slugs:
            continue
        session.add(Service(**payload))
        services_created += 1

    settings_created = session.get(ShopSettings, SETTINGS_ROW_ID) is None
    if settings_created:
        session.add(ShopSettings(id=SETTINGS_ROW_ID))

    session.commit()
    return SeedResult(services_created=services_created, settings_created=settings_created)
