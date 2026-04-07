"""add owner kyc, property deposit, and chat tables

Revision ID: 20260407_chat_kyc_deposit
Revises: 20260328_lease_request_v2
Create Date: 2026-04-07 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect
from sqlalchemy.dialects import postgresql


revision = "20260407_chat_kyc_deposit"
down_revision = "20260328_lease_request_v2"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)

    owner_profile_columns = {column["name"] for column in inspector.get_columns("owner_profiles")}
    if "identity_selfie_name" not in owner_profile_columns:
        op.add_column("owner_profiles", sa.Column("identity_selfie_name", sa.String(length=300), nullable=True))
    if "verification_status" not in owner_profile_columns:
        op.add_column(
            "owner_profiles",
            sa.Column("verification_status", sa.String(length=30), nullable=False, server_default="draft"),
        )
    if "verification_notes" not in owner_profile_columns:
        op.add_column("owner_profiles", sa.Column("verification_notes", sa.Text(), nullable=True))
    if "reviewed_by" not in owner_profile_columns:
        op.add_column("owner_profiles", sa.Column("reviewed_by", postgresql.UUID(as_uuid=True), nullable=True))
        op.create_foreign_key(
            "fk_owner_profiles_reviewed_by_users",
            "owner_profiles",
            "users",
            ["reviewed_by"],
            ["id"],
            ondelete="SET NULL",
        )
    if "reviewed_at" not in owner_profile_columns:
        op.add_column("owner_profiles", sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True))

    property_columns = {column["name"] for column in inspector.get_columns("properties")}
    if "deposit_months" not in property_columns:
        op.add_column("properties", sa.Column("deposit_months", sa.Integer(), nullable=True))

    existing_tables = set(inspector.get_table_names())
    if "conversations" not in existing_tables:
        op.create_table(
            "conversations",
            sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("property_id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("owner_id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("status", sa.String(length=30), nullable=False, server_default="active"),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
            sa.ForeignKeyConstraint(["owner_id"], ["users.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["property_id"], ["properties.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["tenant_id"], ["users.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("property_id", "owner_id", "tenant_id", name="uq_conversation_property_owner_tenant"),
        )
        op.create_index(op.f("ix_conversations_property_id"), "conversations", ["property_id"], unique=False)
        op.create_index(op.f("ix_conversations_owner_id"), "conversations", ["owner_id"], unique=False)
        op.create_index(op.f("ix_conversations_tenant_id"), "conversations", ["tenant_id"], unique=False)

    if "messages" not in existing_tables:
        op.create_table(
            "messages",
            sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("conversation_id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("sender_id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("body", sa.Text(), nullable=False),
            sa.Column("read_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.ForeignKeyConstraint(["conversation_id"], ["conversations.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["sender_id"], ["users.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index(op.f("ix_messages_conversation_id"), "messages", ["conversation_id"], unique=False)
        op.create_index(op.f("ix_messages_sender_id"), "messages", ["sender_id"], unique=False)


def downgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    existing_tables = set(inspector.get_table_names())

    if "messages" in existing_tables:
        op.drop_index(op.f("ix_messages_sender_id"), table_name="messages")
        op.drop_index(op.f("ix_messages_conversation_id"), table_name="messages")
        op.drop_table("messages")

    if "conversations" in existing_tables:
        op.drop_index(op.f("ix_conversations_tenant_id"), table_name="conversations")
        op.drop_index(op.f("ix_conversations_owner_id"), table_name="conversations")
        op.drop_index(op.f("ix_conversations_property_id"), table_name="conversations")
        op.drop_table("conversations")

    property_columns = {column["name"] for column in inspector.get_columns("properties")}
    if "deposit_months" in property_columns:
        op.drop_column("properties", "deposit_months")

    owner_profile_columns = {column["name"] for column in inspector.get_columns("owner_profiles")}
    foreign_keys = {fk["name"] for fk in inspector.get_foreign_keys("owner_profiles") if fk.get("name")}
    if "reviewed_by" in owner_profile_columns and "fk_owner_profiles_reviewed_by_users" in foreign_keys:
        op.drop_constraint("fk_owner_profiles_reviewed_by_users", "owner_profiles", type_="foreignkey")
    if "reviewed_at" in owner_profile_columns:
        op.drop_column("owner_profiles", "reviewed_at")
    if "reviewed_by" in owner_profile_columns:
        op.drop_column("owner_profiles", "reviewed_by")
    if "verification_notes" in owner_profile_columns:
        op.drop_column("owner_profiles", "verification_notes")
    if "verification_status" in owner_profile_columns:
        op.drop_column("owner_profiles", "verification_status")
    if "identity_selfie_name" in owner_profile_columns:
        op.drop_column("owner_profiles", "identity_selfie_name")
