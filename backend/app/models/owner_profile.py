import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, backref, mapped_column, relationship

from app.db.base import Base


class OwnerProfile(Base):
    __tablename__ = "owner_profiles"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )

    city: Mapped[str] = mapped_column(String(120), nullable=False)
    main_address: Mapped[str] = mapped_column(String(300), nullable=False)
    bank_name: Mapped[str] = mapped_column(String(200), nullable=False)
    account_number: Mapped[str] = mapped_column(String(120), nullable=False)
    mobile_money: Mapped[str] = mapped_column(String(120), nullable=False)
    account_holder: Mapped[str] = mapped_column(String(200), nullable=False)

    identity_doc_name: Mapped[str | None] = mapped_column(String(300), nullable=True)
    identity_selfie_name: Mapped[str | None] = mapped_column(String(300), nullable=True)
    property_proof_name: Mapped[str | None] = mapped_column(String(300), nullable=True)
    verification_status: Mapped[str] = mapped_column(String(30), nullable=False, default="draft")
    verification_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    reviewed_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )

    user = relationship(
        "User",
        backref=backref("owner_profile", uselist=False),
        foreign_keys=[user_id],
    )
    reviewer = relationship("User", foreign_keys=[reviewed_by])
