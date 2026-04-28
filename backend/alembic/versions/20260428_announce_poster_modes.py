"""add poster modes and style options to public announcements

Revision ID: 20260428_announce_poster_modes
Revises: 20260428_merge_prop_avail_media
Create Date: 2026-04-28 13:35:00.000000
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


revision = "20260428_announce_poster_modes"
down_revision = "20260428_merge_prop_avail_media"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    if "public_announcements" not in set(inspector.get_table_names()):
        return

    columns = {column["name"] for column in inspector.get_columns("public_announcements")}
    if "display_mode" not in columns:
        op.add_column(
            "public_announcements",
            sa.Column("display_mode", sa.String(length=24), nullable=False, server_default="text"),
        )
    if "font_family" not in columns:
        op.add_column("public_announcements", sa.Column("font_family", sa.String(length=24), nullable=True))
    if "text_color" not in columns:
        op.add_column("public_announcements", sa.Column("text_color", sa.String(length=32), nullable=True))
    if "text_size" not in columns:
        op.add_column("public_announcements", sa.Column("text_size", sa.String(length=24), nullable=True))
    if "text_position" not in columns:
        op.add_column("public_announcements", sa.Column("text_position", sa.String(length=24), nullable=True))
    if "content_inset" not in columns:
        op.add_column("public_announcements", sa.Column("content_inset", sa.String(length=24), nullable=True))
    if "overlay_strength" not in columns:
        op.add_column("public_announcements", sa.Column("overlay_strength", sa.String(length=24), nullable=True))


def downgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    if "public_announcements" not in set(inspector.get_table_names()):
        return

    columns = {column["name"] for column in inspector.get_columns("public_announcements")}
    if "overlay_strength" in columns:
        op.drop_column("public_announcements", "overlay_strength")
    if "content_inset" in columns:
        op.drop_column("public_announcements", "content_inset")
    if "text_position" in columns:
        op.drop_column("public_announcements", "text_position")
    if "text_size" in columns:
        op.drop_column("public_announcements", "text_size")
    if "text_color" in columns:
        op.drop_column("public_announcements", "text_color")
    if "font_family" in columns:
        op.drop_column("public_announcements", "font_family")
    if "display_mode" in columns:
        op.drop_column("public_announcements", "display_mode")
