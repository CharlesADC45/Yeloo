"""add login guard columns and module config

Revision ID: 20260505_login_guard
Revises: 20260428_announce_poster_modes
Create Date: 2026-05-05 10:20:00.000000
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


revision = "20260505_login_guard"
down_revision = "20260428_announce_poster_modes"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    tables = set(inspector.get_table_names())

    if "users" in tables:
        columns = {column["name"] for column in inspector.get_columns("users")}
        if "failed_login_attempts" not in columns:
            op.add_column(
                "users",
                sa.Column("failed_login_attempts", sa.Integer(), nullable=False, server_default="0"),
            )
        if "is_login_locked" not in columns:
            op.add_column(
                "users",
                sa.Column("is_login_locked", sa.Boolean(), nullable=False, server_default=sa.false()),
            )

    if "feature_modules" in tables:
        columns = {column["name"] for column in inspector.get_columns("feature_modules")}
        if "config_value" not in columns:
            op.add_column("feature_modules", sa.Column("config_value", sa.Integer(), nullable=True))


def downgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    tables = set(inspector.get_table_names())

    if "feature_modules" in tables:
        columns = {column["name"] for column in inspector.get_columns("feature_modules")}
        if "config_value" in columns:
            op.drop_column("feature_modules", "config_value")

    if "users" in tables:
        columns = {column["name"] for column in inspector.get_columns("users")}
        if "is_login_locked" in columns:
            op.drop_column("users", "is_login_locked")
        if "failed_login_attempts" in columns:
            op.drop_column("users", "failed_login_attempts")
