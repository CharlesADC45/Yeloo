import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class LeaseRequestPublic(BaseModel):
    id: uuid.UUID
    property_id: uuid.UUID
    owner_id: uuid.UUID
    tenant_id: uuid.UUID
    property_title: str
    property_city: str
    property_neighborhood: str | None = None
    property_address: str | None = None
    property_price: float
    property_price_period: str
    property_type: str
    tenant_full_name: str
    tenant_email: str
    tenant_phone: str | None = None
    contract_text: str
    status: str
    created_at: datetime
    updated_at: datetime
    submitted_at: datetime | None = None
    reviewed_at: datetime | None = None

    class Config:
        from_attributes = True


class LeaseRequestStatusUpdate(BaseModel):
    status: str = Field(pattern="^(approved|rejected)$")
