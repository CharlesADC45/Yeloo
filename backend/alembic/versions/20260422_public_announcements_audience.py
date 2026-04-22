"""add target audience to public announcements

Revision ID: 20260422_public_announcements_audience
Revises: 20260422_public_announcements_promos
Create Date: 2026-04-22 01:00:00.000000
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


revision = "20260422_public_announcements_audience"
down_revision = "20260422_public_announcements_promos"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    if "public_announcements" not in set(inspector.get_table_names()):
        return
    columns = {column["name"] for column in inspector.get_columns("public_announcements")}
    if "target_audience" not in columns:
        op.add_column(
            "public_announcements",
            sa.Column("target_audience", sa.String(length=30), nullable=False, server_default="all"),
        )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    if "public_announcements" not in set(inspector.get_table_names()):
        return
    columns = {column["name"] for column in inspector.get_columns("public_announcements")}
    if "target_audience" in columns:
        op.drop_column("public_announcements", "target_audience")
