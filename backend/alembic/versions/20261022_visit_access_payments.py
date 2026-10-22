"""add visit access payments

Revision ID: 20261022_visit_access_payments
Revises: 20260528_push_subscriptions
Create Date: 2026-10-22 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "20261022_visit_access_payments"
down_revision = "20260528_push_subscriptions"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # init_db() may already have created the table via create_all; only add what is missing then.
    if "visit_access_payments" in sa.inspect(op.get_bind()).get_table_names():
        op.execute("ALTER TABLE visit_access_payments ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE")
        op.execute(
            "UPDATE visit_access_payments SET expires_at = paid_at + interval '30 days' "
            "WHERE payment_status = 'succeeded' AND paid_at IS NOT NULL AND expires_at IS NULL"
        )
        op.execute("CREATE INDEX IF NOT EXISTS ix_visit_access_payments_expires_at ON visit_access_payments (expires_at)")
        return

    op.create_table(
        "visit_access_payments",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("property_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("owner_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("amount", sa.Integer(), nullable=False),
        sa.Column("currency", sa.String(length=10), nullable=False, server_default="XOF"),
        sa.Column("client_reference", sa.String(length=255), nullable=False),
        sa.Column("wave_checkout_session_id", sa.String(length=255), nullable=True),
        sa.Column("wave_launch_url", sa.Text(), nullable=True),
        sa.Column("checkout_status", sa.String(length=40), nullable=False, server_default="pending"),
        sa.Column("payment_status", sa.String(length=40), nullable=False, server_default="pending"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("paid_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["property_id"], ["properties.id"]),
        sa.ForeignKeyConstraint(["tenant_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["owner_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_visit_access_payments_property_id"), "visit_access_payments", ["property_id"], unique=False)
    op.create_index(op.f("ix_visit_access_payments_tenant_id"), "visit_access_payments", ["tenant_id"], unique=False)
    op.create_index(op.f("ix_visit_access_payments_owner_id"), "visit_access_payments", ["owner_id"], unique=False)
    op.create_index(op.f("ix_visit_access_payments_client_reference"), "visit_access_payments", ["client_reference"], unique=True)
    op.create_index(
        op.f("ix_visit_access_payments_wave_checkout_session_id"),
        "visit_access_payments",
        ["wave_checkout_session_id"],
        unique=True,
    )
    op.create_index(op.f("ix_visit_access_payments_expires_at"), "visit_access_payments", ["expires_at"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_visit_access_payments_expires_at"), table_name="visit_access_payments")
    op.drop_index(op.f("ix_visit_access_payments_wave_checkout_session_id"), table_name="visit_access_payments")
    op.drop_index(op.f("ix_visit_access_payments_client_reference"), table_name="visit_access_payments")
    op.drop_index(op.f("ix_visit_access_payments_owner_id"), table_name="visit_access_payments")
    op.drop_index(op.f("ix_visit_access_payments_tenant_id"), table_name="visit_access_payments")
    op.drop_index(op.f("ix_visit_access_payments_property_id"), table_name="visit_access_payments")
    op.drop_table("visit_access_payments")
