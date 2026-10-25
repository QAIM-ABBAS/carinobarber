"""add service images

Adds the gallery of each service. The column stores the public URLs of the
uploaded files, the files themselves live in ``UPLOAD_DIR``.

Revision ID: 9f4c2a7b6d10
Revises: ae5efe84852e
Create Date: 2026-10-25 12:00:00.000000

"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "9f4c2a7b6d10"
down_revision: str | None = "ae5efe84852e"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "services",
        sa.Column("images", sa.JSON(), nullable=False, server_default=sa.text("'[]'")),
    )
    op.alter_column("services", "images", server_default=None)


def downgrade() -> None:
    op.drop_column("services", "images")
