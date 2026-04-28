import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class PublicAnnouncement(Base):
    __tablename__ = "public_announcements"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    icon: Mapped[str] = mapped_column(String(40), nullable=False, default="info")
    display_mode: Mapped[str] = mapped_column(String(24), nullable=False, default="text")
    image_url: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    link_url: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    cta_label: Mapped[str | None] = mapped_column(String(80), nullable=True)
    font_family: Mapped[str | None] = mapped_column(String(24), nullable=True)
    text_color: Mapped[str | None] = mapped_column(String(32), nullable=True)
    text_size: Mapped[str | None] = mapped_column(String(24), nullable=True)
    text_position: Mapped[str | None] = mapped_column(String(24), nullable=True)
    content_inset: Mapped[str | None] = mapped_column(String(24), nullable=True)
    overlay_strength: Mapped[str | None] = mapped_column(String(24), nullable=True)
    target_audience: Mapped[str] = mapped_column(String(30), nullable=False, default="all")
    duration_hours: Mapped[int] = mapped_column(Integer, nullable=False, default=24)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    starts_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )
