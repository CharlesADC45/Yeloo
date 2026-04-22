"""add public announcements and property promos

Revision ID: 20260422_pub_announce_promos
Revises: 20260420_property_advance_months
Create Date: 2026-04-22 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect
from sqlalchemy.dialects import postgresql


revision = "20260422_pub_announce_promos"
down_revision = "20260420_property_advance_months"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)

    existing_tables = set(inspector.get_table_names())
    if "public_announcements" not in existing_tables:
        op.create_table(
            "public_announcements",
            sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("message", sa.Text(), nullable=False),
            sa.Column("icon", sa.String(length=40), nullable=False, server_default="info"),
            sa.Column("target_audience", sa.String(length=30), nullable=False, server_default="all"),
            sa.Column("duration_hours", sa.Integer(), nullable=False, server_default="24"),
            sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
            sa.Column("starts_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index(
            op.f("ix_public_announcements_is_active"),
            "public_announcements",
            ["is_active"],
            unique=False,
        )
        op.create_index(
            op.f("ix_public_announcements_expires_at"),
            "public_announcements",
            ["expires_at"],
            unique=False,
        )
    else:
        announcement_columns = {column["name"] for column in inspector.get_columns("public_announcements")}
        if "target_audience" not in announcement_columns:
            op.add_column(
                "public_announcements",
                sa.Column("target_audience", sa.String(length=30), nullable=False, server_default="all"),
            )

    property_columns = {column["name"] for column in inspector.get_columns("properties")}
    if "promo_label" not in property_columns:
        op.add_column("properties", sa.Column("promo_label", sa.String(length=80), nullable=True))
    if "promo_until" not in property_columns:
        op.add_column("properties", sa.Column("promo_until", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)

    property_columns = {column["name"] for column in inspector.get_columns("properties")}
    if "promo_until" in property_columns:
        op.drop_column("properties", "promo_until")
    if "promo_label" in property_columns:
        op.drop_column("properties", "promo_label")

    existing_tables = set(inspector.get_table_names())
    if "public_announcements" in existing_tables:
        announcement_columns = {column["name"] for column in inspector.get_columns("public_announcements")}
        if "target_audience" in announcement_columns:
            op.drop_column("public_announcements", "target_audience")
        op.drop_index(op.f("ix_public_announcements_expires_at"), table_name="public_announcements")
        op.drop_index(op.f("ix_public_announcements_is_active"), table_name="public_announcements")
        op.drop_table("public_announcements")
