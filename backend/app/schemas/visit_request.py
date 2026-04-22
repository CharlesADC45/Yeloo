import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class VisitRequestCreate(BaseModel):
    preferred_at: datetime
    message: str | None = Field(default=None, max_length=500)


class VisitRequestStatusUpdate(BaseModel):
    status: str = Field(pattern="^(accepted|declined|rescheduled)$")
    proposed_at: datetime | None = None
    owner_message: str | None = Field(default=None, max_length=500)


class VisitRequestPublic(BaseModel):
    id: uuid.UUID
    property_id: uuid.UUID
    owner_id: uuid.UUID
    tenant_id: uuid.UUID
    property_title: str
    property_city: str
    property_neighborhood: str | None = None
    tenant_full_name: str
    tenant_email: str
    tenant_phone: str | None = None
    preferred_at: datetime
    proposed_at: datetime | None = None
    message: str | None = None
    owner_message: str | None = None
    status: str
    created_at: datetime
    updated_at: datetime
    reviewed_at: datetime | None = None

    class Config:
        from_attributes = True
