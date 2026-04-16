from pydantic import BaseModel


class Token(BaseModel):
    access_token: str
    token_type: str


class ChangePasswordPayload(BaseModel):
    current_password: str
    new_password: str

