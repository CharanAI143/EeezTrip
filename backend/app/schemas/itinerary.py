from pydantic import BaseModel, Field
from typing import List, Optional

class ActivitySchema(BaseModel):
    title: str
    time_slot: str = Field(..., description="Morning, Midday, Afternoon, Evening")
    description: str
    estimated_cost_inr: int = 0
    category: str = "general"

class DayPlanSchema(BaseModel):
    day: int = Field(..., ge=1, le=30)
    title: str
    morning: str
    midday: str
    afternoon: str
    evening: str
    tip: str

class ItinerarySchema(BaseModel):
    destination: str
    title: str
    tagline: str
    summary: str
    best_time: str
    highlights: List[str] = Field(default_factory=list)
    daily_plan: List[DayPlanSchema] = Field(default_factory=list)
    cozy_tips: List[str] = Field(default_factory=list)
    must_try_food: List[str] = Field(default_factory=list)
