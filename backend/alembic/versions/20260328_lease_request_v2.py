"""add owner countersignature fields to lease requests

Revision ID: 20260328_lease_request_v2
Revises: 20260315_profile_media
Create Date: 2026-03-28 00:00:00.000000
"""

from alembic import op
from sqlalchemy import inspect


revision = "20260328_lease_request_v2"
down_revision = "20260315_profile_media"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    existing_columns = {column["name"] for column in inspector.get_columns("lease_requests")}

    if "owner_signature_data" not in existing_columns:
        op.execute(
            "ALTER TABLE lease_requests ADD COLUMN IF NOT EXISTS owner_signature_data TEXT"
        )
    if "owner_signed_at" not in existing_columns:
        op.execute(
            "ALTER TABLE lease_requests ADD COLUMN IF NOT EXISTS owner_signed_at TIMESTAMP WITH TIME ZONE"
        )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    existing_columns = {column["name"] for column in inspector.get_columns("lease_requests")}

    if "owner_signed_at" in existing_columns:
        op.drop_column("lease_requests", "owner_signed_at")
    if "owner_signature_data" in existing_columns:
        op.drop_column("lease_requests", "owner_signature_data")
