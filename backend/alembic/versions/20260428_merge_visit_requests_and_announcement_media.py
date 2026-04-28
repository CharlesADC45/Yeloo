"""merge visit requests and public announcement media heads

Revision ID: 20260428_merge_visit_media
Revises: 20260422_visit_requests, 20260428_pub_announce_media
Create Date: 2026-04-28 13:00:00.000000
"""

from alembic import op


revision = "20260428_merge_visit_media"
down_revision = ("20260422_visit_requests", "20260428_pub_announce_media")
branch_labels = None
depends_on = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
