from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class TravelInsightItem(BaseModel):
    category: str
    title: str
    message: str
    badge: str = "Insight"
    severity: str = "info"  # info, warning, success, alert

class TravelIntelligenceResponse(BaseModel):
    destination: str
    weather_summary: Dict[str, Any]
    insights: List[TravelInsightItem] = Field(default_factory=list)
