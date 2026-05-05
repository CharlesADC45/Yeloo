import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True, nullable=False)
    phone: Mapped[str | None] = mapped_column(String(50), unique=True, index=True, nullable=True)
    full_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)

    role: Mapped[str] = mapped_column(
        Enum("proprietaire", "locataire", "admin", name="user_role"),
        nullable=False,
        default="locataire",
    )

    is_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_phone_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    identity_doc_url: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    property_proof_url: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    profile_image_url: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    trust_badge: Mapped[str] = mapped_column(
        Enum("none", "phone", "identity", "full", name="trust_badge"),
        nullable=False,
        default="none",
    )

    report_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_suspended: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    failed_login_attempts: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_login_locked: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    @property
    def owner_verification_status(self) -> str | None:
        profile = getattr(self, "owner_profile", None)
        if not profile:
            return None
        return getattr(profile, "verification_status", None)

