from pydantic import BaseModel, Field
from typing import Dict, Any, List, Optional
import datetime

class PreferenceItem(BaseModel):
    value: Any
    confidence: float = Field(ge=0.0, le=1.0, default=0.5)
    source: str = "BEHAVIOR"  # EXPLICIT, BEHAVIOR, SESSION, IMPORTED
    updated_at: str = Field(default_factory=lambda: datetime.datetime.now(datetime.UTC).isoformat() + "Z")

class PreferenceHistoryEntry(BaseModel):
    key: str
    previous_value: Any
    new_value: Any
    previous_confidence: float
    new_confidence: float
    reason: str
    timestamp: str = Field(default_factory=lambda: datetime.datetime.now(datetime.UTC).isoformat() + "Z")

class UserPreferenceProfile(BaseModel):
    user_id: str = "anonymous"
    travel_style: PreferenceItem = Field(default_factory=lambda: PreferenceItem(value="balanced", confidence=0.8, source="EXPLICIT"))
    budget_level: PreferenceItem = Field(default_factory=lambda: PreferenceItem(value="moderate", confidence=0.8, source="EXPLICIT"))
    walking_preference: PreferenceItem = Field(default_factory=lambda: PreferenceItem(value="moderate", confidence=0.7, source="BEHAVIOR"))
    preferred_transport: PreferenceItem = Field(default_factory=lambda: PreferenceItem(value="public_transit", confidence=0.75, source="BEHAVIOR"))
    hotel_style: PreferenceItem = Field(default_factory=lambda: PreferenceItem(value="boutique", confidence=0.85, source="BEHAVIOR"))
    activity_pacing: PreferenceItem = Field(default_factory=lambda: PreferenceItem(value="relaxed", confidence=0.9, source="EXPLICIT"))
    
    # Interest Scores (0.0 to 1.0)
    museum_interest: PreferenceItem = Field(default_factory=lambda: PreferenceItem(value=0.5, confidence=0.6, source="BEHAVIOR"))
    nature_interest: PreferenceItem = Field(default_factory=lambda: PreferenceItem(value=0.7, confidence=0.7, source="BEHAVIOR"))
    food_interest: PreferenceItem = Field(default_factory=lambda: PreferenceItem(value=0.85, confidence=0.9, source="BEHAVIOR"))
    nightlife_interest: PreferenceItem = Field(default_factory=lambda: PreferenceItem(value=0.3, confidence=0.6, source="BEHAVIOR"))
    shopping_interest: PreferenceItem = Field(default_factory=lambda: PreferenceItem(value=0.4, confidence=0.5, source="BEHAVIOR"))
    photography_interest: PreferenceItem = Field(default_factory=lambda: PreferenceItem(value=0.8, confidence=0.8, source="BEHAVIOR"))
    adventure_interest: PreferenceItem = Field(default_factory=lambda: PreferenceItem(value=0.6, confidence=0.7, source="BEHAVIOR"))
    
    favorite_categories: List[str] = Field(default_factory=lambda: ["Food & Culinary", "Photography", "Scenic Viewpoints"])
    avoided_categories: List[str] = Field(default_factory=lambda: [])

class RecommendationExplanation(BaseModel):
    recommendation_id: str
    title: str
    reasons: List[str]
    matched_preferences: List[str]
    real_world_place_id: Optional[str] = None
    district_neighborhood: Optional[str] = None

class PrivacySettings(BaseModel):
    learning_enabled: bool = True
    share_anonymous_analytics: bool = True
    auto_apply_personalized_ranks: bool = True
