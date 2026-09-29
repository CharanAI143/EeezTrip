from pydantic import BaseModel, ConfigDict, Field
from typing import List, Literal, Optional

LandscapeType = Literal["beach", "mountain", "city", "culture", "desert", "island"]
SeasonalType = Literal["nature", "city", "beach", "culture"]


class MoodRequest(BaseModel):
    mood: str = "Relaxed"
    budget: int = 50000
    currency: str = "INR"
    count: int = Field(3, ge=1, le=8)


class MoodChoice(BaseModel):
    name: str
    description: str
    whyMatch: str
    estimatedCost: int = 0
    landscapeType: str = "city"
    highlight: str = ""


class SeasonalRequest(BaseModel):
    location: str = ""
    month: int = Field(1, ge=1, le=12)


class SeasonalDestination(BaseModel):
    name: str
    description: str
    highlight: str = ""
    type: SeasonalType = "culture"


class SeasonalData(BaseModel):
    # `global` is a Python keyword, so the field is named `global_` and aliased
    # back to `global` on the wire — the frontend contract is unchanged.
    nearby: List[SeasonalDestination] = Field(default_factory=list)
    national: List[SeasonalDestination] = Field(default_factory=list)
    global_: List[SeasonalDestination] = Field(
        default_factory=list, alias="global", serialization_alias="global"
    )

    model_config = ConfigDict(populate_by_name=True)


class VoiceExtractRequest(BaseModel):
    transcript: str = ""


class ExtractedTripData(BaseModel):
    """Every field is optional: a partial transcript should extract what it can."""

    startLocation: Optional[str] = None
    destination: Optional[str] = None
    budget: Optional[int] = None
    currency: Optional[str] = None
    duration: Optional[int] = None
    tripTypes: Optional[List[str]] = None
    preferences: Optional[List[str]] = None
