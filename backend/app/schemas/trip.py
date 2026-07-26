from pydantic import BaseModel, Field
from typing import List, Optional

class TripRequest(BaseModel):
    origin: str = ""
    destination: str = ""
    mood: str = "Relaxed"
    budget: int = 50000
    days: int = 4
    start_date: str = Field("", alias="startDate")
    end_date: str = Field("", alias="endDate")
    mode: str = "normal"

    class Config:
        populate_by_name = True

class DayPlan(BaseModel):
    day: int
    title: str
    morning: str
    midday: str
    afternoon: str
    evening: str
    tip: str

class CostBreakdown(BaseModel):
    accommodation: int
    food: int
    transport: int
    activities: int
    misc: int

class TripResponse(BaseModel):
    destination: Optional[str] = None
    title: str
    tagline: str
    summary: str
    best_time: str
    highlights: List[str]
    daily_plan: List[DayPlan]
    cozy_tips: List[str]
    must_try_food: List[str]
    estimated_cost_breakdown: CostBreakdown

class PlanRevisionRequest(BaseModel):
    preferences: TripRequest
    current_plan: TripResponse
    instruction: str = Field(..., min_length=3)

class PlanRevisionResponse(BaseModel):
    revised_plan: TripResponse
    change_summary: str
    reasoning: str
