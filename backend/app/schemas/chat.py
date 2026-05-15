import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class ConversationEnsurePayload(BaseModel):
    property_id: uuid.UUID


class MessageCreate(BaseModel):
    body: str = Field(min_length=1, max_length=4000)


class MessagePublic(BaseModel):
    id: uuid.UUID
    conversation_id: uuid.UUID
    sender_id: uuid.UUID
    body: str
    attachment_url: str | None = None
    attachment_name: str | None = None
    attachment_type: str | None = None
    read_at: datetime | None = None
    created_at: datetime

    class Config:
        from_attributes = True


class ConversationPublic(BaseModel):
    id: uuid.UUID
    property_id: uuid.UUID
    owner_id: uuid.UUID
    tenant_id: uuid.UUID
    status: str
    created_at: datetime
    updated_at: datetime
    property_title: str
    property_city: str
    property_image_url: str | None = None
    last_message_preview: str | None = None
    unread_count: int = 0
    counterpart_name: str | None = None
    counterpart_role: str | None = None
    counterpart_phone: str | None = None
    counterpart_email: str | None = None
    counterpart_avatar_url: str | None = None


class ConversationDetailPublic(ConversationPublic):
    messages: list[MessagePublic]
