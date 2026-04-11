"""add profile image and media urls

Revision ID: 20260315_profile_media
Revises: None
Create Date: 2026-03-15 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

from app.db.base import Base
from app import models  # noqa: F401


revision = "20260315_profile_media"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    existing_tables = set(inspector.get_table_names())

    if "users" not in existing_tables or "properties" not in existing_tables:
        Base.metadata.create_all(bind=bind)
        inspector = inspect(bind)

    user_columns = {column["name"] for column in inspector.get_columns("users")}
    property_columns = {column["name"] for column in inspector.get_columns("properties")}

    if "profile_image_url" not in user_columns:
        op.add_column("users", sa.Column("profile_image_url", sa.String(length=1000), nullable=True))
    if "video_url" not in property_columns:
        op.add_column("properties", sa.Column("video_url", sa.String(length=1000), nullable=True))
    if "tour_360_url" not in property_columns:
        op.add_column("properties", sa.Column("tour_360_url", sa.String(length=1000), nullable=True))


def downgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    existing_tables = set(inspector.get_table_names())

    if "properties" in existing_tables:
        property_columns = {column["name"] for column in inspector.get_columns("properties")}
        if "tour_360_url" in property_columns:
            op.drop_column("properties", "tour_360_url")
        if "video_url" in property_columns:
            op.drop_column("properties", "video_url")

    if "users" in existing_tables:
        user_columns = {column["name"] for column in inspector.get_columns("users")}
        if "profile_image_url" in user_columns:
            op.drop_column("users", "profile_image_url")
