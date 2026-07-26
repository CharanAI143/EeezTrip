from pydantic import BaseModel, Field
from typing import List

class ChatMessageSchema(BaseModel):
    role: str = Field(..., description="user, assistant, or system")
    content: str = Field(..., min_length=1)

class ChatRequestSchema(BaseModel):
    messages: List[ChatMessageSchema] = Field(default_factory=list)

class ChatResponseSchema(BaseModel):
    reply: str
