"""add property advance months

Revision ID: 20260420_property_advance_months
Revises: 20260407_chat_kyc_deposit
Create Date: 2026-04-20 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


revision = "20260420_property_advance_months"
down_revision = "20260407_chat_kyc_deposit"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)

    property_columns = {column["name"] for column in inspector.get_columns("properties")}
    if "advance_months" not in property_columns:
        op.add_column("properties", sa.Column("advance_months", sa.Integer(), nullable=True))


def downgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)

    property_columns = {column["name"] for column in inspector.get_columns("properties")}
    if "advance_months" in property_columns:
        op.drop_column("properties", "advance_months")
