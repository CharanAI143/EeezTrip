from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from enum import Enum

class IntentType(str, Enum):
    TRIP_QUESTION = "TRIP_QUESTION"
    WEATHER_QUESTION = "WEATHER_QUESTION"
    REVISION_REQUEST = "REVISION_REQUEST"
    PLACE_RECOMMENDATION = "PLACE_RECOMMENDATION"
    PACKING_ADVICE = "PACKING_ADVICE"
    GENERAL_TRAVEL_ADVICE = "GENERAL_TRAVEL_ADVICE"

class ConciergeRequest(BaseModel):
    user_id: str = "anonymous"
    session_id: Optional[str] = None
    query: str = Field(..., min_length=2)

class ConciergeResponse(BaseModel):
    reply: str
    detected_intent: IntentType
    confidence: float = 0.95
    action_taken: str
    metadata: Dict[str, Any] = Field(default_factory=dict)
