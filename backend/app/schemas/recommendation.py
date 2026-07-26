from pydantic import BaseModel, Field
from typing import List, Optional

class DestinationRecommendationSchema(BaseModel):
    name: str
    description: str
    why_match: str
    estimated_cost: int
    landscape_type: str
    highlight: str
