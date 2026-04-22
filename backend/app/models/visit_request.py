import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class VisitRequest(Base):
    __tablename__ = "visit_requests"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    property_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("properties.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    owner_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    property_title: Mapped[str] = mapped_column(String(200), nullable=False)
    property_city: Mapped[str] = mapped_column(String(120), nullable=False)
    property_neighborhood: Mapped[str | None] = mapped_column(String(120), nullable=True)

    tenant_full_name: Mapped[str] = mapped_column(String(200), nullable=False)
    tenant_email: Mapped[str] = mapped_column(String(320), nullable=False)
    tenant_phone: Mapped[str | None] = mapped_column(String(50), nullable=True)

    preferred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    proposed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    message: Mapped[str | None] = mapped_column(Text, nullable=True)
    owner_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(
        Enum(
            "pending",
            "accepted",
            "declined",
            "rescheduled",
            "cancelled",
            name="visit_request_status",
        ),
        nullable=False,
        default="pending",
    )

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    property = relationship("Property", lazy="joined")
    owner = relationship("User", foreign_keys=[owner_id], lazy="joined")
    tenant = relationship("User", foreign_keys=[tenant_id], lazy="joined")
