"""initial schema

Creates services, bookings, shop_settings and closed_dates together with the
partial unique index that guarantees a single active booking per time slot.

Revision ID: ae5efe84852e
Revises:
Create Date: 2026-10-20 14:43:55.573869

"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

import app.db.base  # noqa: F401  (required for the custom UTCDateTime type)
from app.db.base import UTCDateTime

revision: str = "ae5efe84852e"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

ACTIVE_SLOT_CONDITION = "status <> 'cancelled'"


def upgrade() -> None:
    op.create_table(
        "closed_dates",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("reason", sa.String(length=200), nullable=True),
        sa.Column(
            "created_at",
            UTCDateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            UTCDateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_closed_dates")),
        sa.UniqueConstraint("date", name=op.f("uq_closed_dates_date")),
    )
    op.create_table(
        "services",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("slug", sa.String(length=50), nullable=False),
        sa.Column("label", sa.String(length=100), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("price", sa.Integer(), nullable=False),
        sa.Column("duration_minutes", sa.Integer(), nullable=False),
        sa.Column("includes", sa.JSON(), nullable=False),
        sa.Column("featured", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("sort_order", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column(
            "created_at",
            UTCDateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            UTCDateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.CheckConstraint("duration_minutes > 0", name="ck_services_duration_minutes"),
        sa.CheckConstraint("price >= 0", name="ck_services_price"),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_services")),
        sa.UniqueConstraint("slug", name=op.f("uq_services_slug")),
    )
    op.create_table(
        "shop_settings",
        sa.Column("id", sa.Integer(), autoincrement=False, nullable=False),
        sa.Column("open_hour", sa.Integer(), server_default=sa.text("10"), nullable=False),
        sa.Column("close_hour", sa.Integer(), server_default=sa.text("21"), nullable=False),
        sa.Column("closed_weekdays", sa.JSON(), nullable=False),
        sa.Column(
            "booking_window_days", sa.Integer(), server_default=sa.text("14"), nullable=False
        ),
        sa.Column("cancel_before_hours", sa.Integer(), server_default=sa.text("2"), nullable=False),
        sa.Column(
            "max_active_bookings_per_phone",
            sa.Integer(),
            server_default=sa.text("3"),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            UTCDateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            UTCDateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "booking_window_days >= 1 AND booking_window_days <= 60",
            name="ck_shop_settings_booking_window_days",
        ),
        sa.CheckConstraint(
            "cancel_before_hours >= 0", name="ck_shop_settings_cancel_before_hours"
        ),
        sa.CheckConstraint(
            "close_hour >= 0 AND close_hour <= 24", name="ck_shop_settings_close_hour"
        ),
        sa.CheckConstraint(
            "max_active_bookings_per_phone >= 0",
            name="ck_shop_settings_max_active_bookings_per_phone",
        ),
        sa.CheckConstraint("open_hour < close_hour", name="ck_shop_settings_hours_order"),
        sa.CheckConstraint("open_hour >= 0 AND open_hour <= 24", name="ck_shop_settings_open_hour"),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_shop_settings")),
    )
    op.create_table(
        "bookings",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("code", sa.String(length=6), nullable=False),
        sa.Column("service_id", sa.Integer(), nullable=False),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("time", sa.String(length=5), nullable=False),
        sa.Column("customer_name", sa.String(length=100), nullable=False),
        sa.Column("phone", sa.String(length=11), nullable=False),
        sa.Column(
            "status",
            sa.String(length=20),
            server_default=sa.text("'pending'"),
            nullable=False,
        ),
        sa.Column("price_at_booking", sa.Integer(), nullable=False),
        sa.Column("admin_note", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            UTCDateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            UTCDateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "status IN ('pending', 'confirmed', 'completed', 'cancelled', 'no_show')",
            name="ck_bookings_status",
        ),
        sa.CheckConstraint("price_at_booking >= 0", name="ck_bookings_price_at_booking"),
        sa.ForeignKeyConstraint(
            ["service_id"],
            ["services.id"],
            name=op.f("fk_bookings_service_id_services"),
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_bookings")),
        sa.UniqueConstraint("code", name=op.f("uq_bookings_code")),
    )
    op.create_index("ix_bookings_date", "bookings", ["date"], unique=False)
    op.create_index("ix_bookings_phone", "bookings", ["phone"], unique=False)
    op.create_index(
        "uq_bookings_active_slot",
        "bookings",
        ["date", "time"],
        unique=True,
        postgresql_where=sa.text(ACTIVE_SLOT_CONDITION),
        sqlite_where=sa.text(ACTIVE_SLOT_CONDITION),
    )


def downgrade() -> None:
    op.drop_index(
        "uq_bookings_active_slot",
        table_name="bookings",
        postgresql_where=sa.text(ACTIVE_SLOT_CONDITION),
        sqlite_where=sa.text(ACTIVE_SLOT_CONDITION),
    )
    op.drop_index("ix_bookings_phone", table_name="bookings")
    op.drop_index("ix_bookings_date", table_name="bookings")
    op.drop_table("bookings")
    op.drop_table("shop_settings")
    op.drop_table("services")
    op.drop_table("closed_dates")
