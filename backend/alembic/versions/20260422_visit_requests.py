"""add visit requests

Revision ID: 20260422_visit_requests
Revises: 20260422_pub_announce_audience
Create Date: 2026-04-22 02:00:00.000000
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect
from sqlalchemy.dialects import postgresql


revision = "20260422_visit_requests"
down_revision = "20260422_pub_announce_audience"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    if "visit_requests" in set(inspector.get_table_names()):
        return

    status_enum = sa.Enum(
        "pending",
        "accepted",
        "declined",
        "rescheduled",
        "cancelled",
        name="visit_request_status",
    )
    status_enum.create(bind, checkfirst=True)

    op.create_table(
        "visit_requests",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("property_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("owner_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("property_title", sa.String(length=200), nullable=False),
        sa.Column("property_city", sa.String(length=120), nullable=False),
        sa.Column("property_neighborhood", sa.String(length=120), nullable=True),
        sa.Column("tenant_full_name", sa.String(length=200), nullable=False),
        sa.Column("tenant_email", sa.String(length=320), nullable=False),
        sa.Column("tenant_phone", sa.String(length=50), nullable=True),
        sa.Column("preferred_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("proposed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("message", sa.Text(), nullable=True),
        sa.Column("owner_message", sa.Text(), nullable=True),
        sa.Column("status", status_enum, nullable=False, server_default="pending"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["owner_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["property_id"], ["properties.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["tenant_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_visit_requests_owner_id"), "visit_requests", ["owner_id"], unique=False)
    op.create_index(op.f("ix_visit_requests_property_id"), "visit_requests", ["property_id"], unique=False)
    op.create_index(op.f("ix_visit_requests_tenant_id"), "visit_requests", ["tenant_id"], unique=False)


def downgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    if "visit_requests" in set(inspector.get_table_names()):
        op.drop_index(op.f("ix_visit_requests_tenant_id"), table_name="visit_requests")
        op.drop_index(op.f("ix_visit_requests_property_id"), table_name="visit_requests")
        op.drop_index(op.f("ix_visit_requests_owner_id"), table_name="visit_requests")
        op.drop_table("visit_requests")

    status_enum = sa.Enum(
        "pending",
        "accepted",
        "declined",
        "rescheduled",
        "cancelled",
        name="visit_request_status",
    )
    status_enum.drop(bind, checkfirst=True)
