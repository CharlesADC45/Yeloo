import uuid
from datetime import datetime

from pydantic import BaseModel, Field


EMAIL_PATTERN = r"^[^@\s]+@[^@\s]+\.[^@\s]+$"


class UserCreate(BaseModel):
    email: str = Field(pattern=EMAIL_PATTERN)
    phone: str | None = None
    full_name: str | None = None
    password: str = Field(min_length=6)
    role: str = Field(default="locataire", pattern="^(proprietaire|locataire|admin)$")


class UserPublic(BaseModel):
    id: uuid.UUID
    email: str
    phone: str | None = None
    full_name: str | None = None
    profile_image_url: str | None = None
    role: str
    is_verified: bool
    is_phone_verified: bool
    trust_badge: str
    report_count: int
    is_suspended: bool
    owner_verification_status: str | None = None
    created_at: datetime

    class Config:
        from_attributes = True

