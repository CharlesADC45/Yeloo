"""add property availability status

Revision ID: 20260422_property_availability
Revises: 20260422_visit_requests
Create Date: 2026-04-22 03:00:00.000000
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect
from sqlalchemy.dialects import postgresql


revision = "20260422_property_availability"
down_revision = "20260422_visit_requests"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    if "properties" not in set(inspector.get_table_names()):
        return
    columns = {column["name"] for column in inspector.get_columns("properties")}
    if "availability_status" in columns:
        return

    availability_enum = postgresql.ENUM(
        "available",
        "reserved",
        "rented",
        name="property_availability_status",
        create_type=False,
    )
    availability_enum.create(bind, checkfirst=True)
    op.add_column(
        "properties",
        sa.Column("availability_status", availability_enum, nullable=False, server_default="available"),
    )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    if "properties" in set(inspector.get_table_names()):
        columns = {column["name"] for column in inspector.get_columns("properties")}
        if "availability_status" in columns:
            op.drop_column("properties", "availability_status")

    availability_enum = postgresql.ENUM(
        "available",
        "reserved",
        "rented",
        name="property_availability_status",
        create_type=False,
    )
    availability_enum.drop(bind, checkfirst=True)
