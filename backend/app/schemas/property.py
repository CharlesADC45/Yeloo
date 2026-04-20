import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class PropertyCreate(BaseModel):
    title: str = Field(min_length=3, max_length=200)
    description: str | None = Field(default=None, max_length=5000)
    property_type: str = Field(min_length=2, max_length=50)

    price: float = Field(gt=0)
    price_period: str = Field(default="mois", pattern="^(jour|semaine|mois)$")
    deposit_months: int = Field(ge=1)
    advance_months: int = Field(ge=1)
    surface_m2: int | None = Field(default=None, gt=0)
    rooms: int | None = Field(default=None, ge=0)
    bathrooms: int | None = Field(default=None, ge=0)

    address: str | None = Field(default=None, max_length=300)
    city: str = Field(min_length=2, max_length=120)
    neighborhood: str | None = Field(default=None, max_length=120)
    latitude: float | None = None
    longitude: float | None = None
    is_furnished: bool = False
    video_url: str | None = Field(default=None, max_length=1000)
    tour_360_url: str | None = Field(default=None, max_length=1000)


class PropertyUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=3, max_length=200)
    description: str | None = Field(default=None, max_length=5000)
    property_type: str | None = Field(default=None, min_length=2, max_length=50)

    price: float | None = Field(default=None, gt=0)
    price_period: str | None = Field(default=None, pattern="^(jour|semaine|mois)$")
    deposit_months: int | None = Field(default=None, ge=1)
    advance_months: int | None = Field(default=None, ge=1)
    surface_m2: int | None = Field(default=None, gt=0)
    rooms: int | None = Field(default=None, ge=0)
    bathrooms: int | None = Field(default=None, ge=0)

    address: str | None = Field(default=None, max_length=300)
    city: str | None = Field(default=None, min_length=2, max_length=120)
    neighborhood: str | None = Field(default=None, max_length=120)
    latitude: float | None = None
    longitude: float | None = None
    is_furnished: bool | None = None
    status: str | None = Field(default=None, pattern="^(draft|published|suspendu)$")
    video_url: str | None = Field(default=None, max_length=1000)
    tour_360_url: str | None = Field(default=None, max_length=1000)


class PropertyPublic(BaseModel):
    id: uuid.UUID
    owner_id: uuid.UUID
    title: str
    description: str | None = None
    property_type: str
    price: float
    price_period: str
    deposit_months: int | None = None
    advance_months: int | None = None
    surface_m2: int | None = None
    rooms: int | None = None
    bathrooms: int | None = None
    address: str | None = None
    city: str
    neighborhood: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    video_url: str | None = None
    tour_360_url: str | None = None
    is_furnished: bool
    status: str
    is_verified_listing: bool
    views_count: int
    created_at: datetime
    photo_urls: list[str] = []
    owner_is_verified: bool = False

    class Config:
        from_attributes = True
