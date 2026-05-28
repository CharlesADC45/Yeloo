from pydantic import BaseModel, Field


class PushVapidPublicKey(BaseModel):
    public_key: str | None
    configured: bool


class PushSubscriptionKeys(BaseModel):
    p256dh: str = Field(min_length=1)
    auth: str = Field(min_length=1)


class PushSubscriptionPayload(BaseModel):
    endpoint: str = Field(min_length=1)
    keys: PushSubscriptionKeys
    user_agent: str | None = None


class PushSubscriptionDeletePayload(BaseModel):
    endpoint: str = Field(min_length=1)
