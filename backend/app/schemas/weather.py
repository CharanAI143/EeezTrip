from pydantic import BaseModel, Field
from typing import List, Optional

class WeatherResponseSchema(BaseModel):
    temperature_max: float
    temperature_min: float
    condition: str
    is_day: int = 1
    needs_alternatives: bool = False

class AlternativePlanRequestSchema(BaseModel):
    destination: str = Field(..., min_length=2)
    condition: str
    mood: str
