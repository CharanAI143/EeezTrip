from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from backend.app.schemas.trip import TripRequest, TripResponse

class RevisionHistoryItem(BaseModel):
    instruction: str
    change_summary: str
    itinerary_snapshot: TripResponse
    timestamp: str

class TripSessionResponse(BaseModel):
    session_id: str
    user_id: str = "anonymous"
    preferences: TripRequest
    current_itinerary: Optional[TripResponse] = None
    revision_history: List[RevisionHistoryItem] = Field(default_factory=list)
    created_at: str
    updated_at: str

class CreateSessionRequest(BaseModel):
    user_id: str = "anonymous"
    preferences: TripRequest
    itinerary: TripResponse
