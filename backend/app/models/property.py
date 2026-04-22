import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Integer, Numeric, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Property(Base):
    __tablename__ = "properties"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    owner_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)

    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(String(5000), nullable=True)
    property_type: Mapped[str] = mapped_column(String(50), nullable=False)

    price: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    price_period: Mapped[str] = mapped_column(Enum("jour", "semaine", "mois", name="price_period"), nullable=False, default="mois")
    deposit_months: Mapped[int | None] = mapped_column(Integer, nullable=True)
    advance_months: Mapped[int | None] = mapped_column(Integer, nullable=True)
    surface_m2: Mapped[int | None] = mapped_column(Integer, nullable=True)

    rooms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    bathrooms: Mapped[int | None] = mapped_column(Integer, nullable=True)

    address: Mapped[str | None] = mapped_column(String(300), nullable=True)
    city: Mapped[str] = mapped_column(String(120), nullable=False, index=True)
    neighborhood: Mapped[str | None] = mapped_column(String(120), nullable=True, index=True)
    latitude: Mapped[float | None] = mapped_column(Numeric(10, 7), nullable=True)
    longitude: Mapped[float | None] = mapped_column(Numeric(10, 7), nullable=True)
    video_url: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    tour_360_url: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    promo_label: Mapped[str | None] = mapped_column(String(80), nullable=True)
    promo_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    is_furnished: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    status: Mapped[str] = mapped_column(
        Enum("draft", "published", "suspendu", name="property_status"),
        nullable=False,
        default="draft",
    )
    is_verified_listing: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    views_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    boost_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    owner = relationship("User", lazy="joined")
    photos = relationship(
        "PropertyPhoto",
        back_populates="property",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    @property
    def photo_urls(self) -> list[str]:
        return [photo.url for photo in self.photos or []]

    @property
    def owner_is_verified(self) -> bool:
        return bool(self.owner and self.owner.is_verified)

