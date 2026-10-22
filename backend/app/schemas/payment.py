import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class VisitAccessCheckoutCreate(BaseModel):
    success_url: str | None = Field(default=None, max_length=1000)
    error_url: str | None = Field(default=None, max_length=1000)


class VisitAccessCheckoutPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    property_id: uuid.UUID
    amount: int
    currency: str
    checkout_status: str
    payment_status: str
    wave_checkout_session_id: str | None = None
    wave_launch_url: str
    created_at: datetime


class VisitAccessStatusPublic(BaseModel):
    has_access: bool
    payment_id: uuid.UUID | None = None
    payment_status: str | None = None
    checkout_status: str | None = None
    amount: int
    currency: str
    paid_at: datetime | None = None
    expires_at: datetime | None = None
