from pydantic import BaseModel, EmailStr, Field
from typing import Optional

class UserBase(BaseModel):
    email: Optional[EmailStr] = None
    display_name: Optional[str] = Field(None, max_length=100)
    photo_url: Optional[str] = None

class UserCreate(UserBase):
    uid: str = Field(..., description="Firebase Auth UID")

class UserOut(UserBase):
    id: str
    uid: str
    created_at: str

    class Config:
        from_attributes = True
