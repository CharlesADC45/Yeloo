"""add chat attachment fields

Revision ID: 20260515_chat_attachments
Revises: 20260505_login_guard
Create Date: 2026-05-15 11:10:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "20260515_chat_attachments"
down_revision = "20260505_login_guard"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("messages", sa.Column("attachment_url", sa.String(length=1000), nullable=True))
    op.add_column("messages", sa.Column("attachment_name", sa.String(length=255), nullable=True))
    op.add_column("messages", sa.Column("attachment_type", sa.String(length=120), nullable=True))


def downgrade() -> None:
    op.drop_column("messages", "attachment_type")
    op.drop_column("messages", "attachment_name")
    op.drop_column("messages", "attachment_url")
