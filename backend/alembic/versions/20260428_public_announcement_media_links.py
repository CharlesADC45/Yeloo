"""add media and links to public announcements

Revision ID: 20260428_pub_announce_media
Revises: 20260422_pub_announce_audience
Create Date: 2026-04-28 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


revision = "20260428_pub_announce_media"
down_revision = "20260422_pub_announce_audience"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    if "public_announcements" not in set(inspector.get_table_names()):
        return

    columns = {column["name"] for column in inspector.get_columns("public_announcements")}
    if "image_url" not in columns:
        op.add_column("public_announcements", sa.Column("image_url", sa.String(length=1000), nullable=True))
    if "link_url" not in columns:
        op.add_column("public_announcements", sa.Column("link_url", sa.String(length=1000), nullable=True))
    if "cta_label" not in columns:
        op.add_column("public_announcements", sa.Column("cta_label", sa.String(length=80), nullable=True))


def downgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    if "public_announcements" not in set(inspector.get_table_names()):
        return

    columns = {column["name"] for column in inspector.get_columns("public_announcements")}
    if "cta_label" in columns:
        op.drop_column("public_announcements", "cta_label")
    if "link_url" in columns:
        op.drop_column("public_announcements", "link_url")
    if "image_url" in columns:
        op.drop_column("public_announcements", "image_url")
