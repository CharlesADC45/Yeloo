"""add profile image and media urls

Revision ID: 20260315_profile_media
Revises: None
Create Date: 2026-03-15 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "20260315_profile_media"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("profile_image_url", sa.String(length=1000), nullable=True))
    op.add_column("properties", sa.Column("video_url", sa.String(length=1000), nullable=True))
    op.add_column("properties", sa.Column("tour_360_url", sa.String(length=1000), nullable=True))


def downgrade() -> None:
    op.drop_column("properties", "tour_360_url")
    op.drop_column("properties", "video_url")
    op.drop_column("users", "profile_image_url")
