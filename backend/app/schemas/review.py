from pydantic import BaseModel, Field
from typing import Optional

class ReviewCreateSchema(BaseModel):
    user_id: str = "anonymous"
    destination: str = Field(..., min_length=2, max_length=150)
    rating: int = Field(..., ge=1, le=5)
    comment: str = Field(..., min_length=5, max_length=2000)
    video_url: Optional[str] = None

class ReviewOutSchema(ReviewCreateSchema):
    id: str
    created_at: str
