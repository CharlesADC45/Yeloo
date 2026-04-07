import uuid
from datetime import datetime

from pydantic import BaseModel


class OwnerProfilePublic(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    city: str
    main_address: str
    bank_name: str
    account_number: str
    mobile_money: str
    account_holder: str
    identity_doc_name: str | None = None
    identity_selfie_name: str | None = None
    property_proof_name: str | None = None
    verification_status: str
    verification_notes: str | None = None
    reviewed_by: uuid.UUID | None = None
    reviewed_at: datetime | None = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
