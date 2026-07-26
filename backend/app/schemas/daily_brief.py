from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from enum import Enum

class RecommendationSeverity(str, Enum):
    INFO = "INFO"
    SUGGESTION = "SUGGESTION"
    IMPORTANT = "IMPORTANT"
    CRITICAL = "CRITICAL"

class BriefRecommendation(BaseModel):
    title: str
    description: str
    severity: RecommendationSeverity
    action_type: str = "general"  # weather_opt, traffic_opt, timing_opt

class TripHealthScore(BaseModel):
    score: int = Field(..., ge=0, le=100)
    contributing_factors: List[Dict[str, Any]] = Field(default_factory=list)
    improvement_delta: int = 0

class DailyBriefSections(BaseModel):
    weather: List[str] = Field(default_factory=list)
    transport: List[str] = Field(default_factory=list)
    events: List[str] = Field(default_factory=list)
    warnings: List[str] = Field(default_factory=list)
    opportunities: List[str] = Field(default_factory=list)

class DailyBrief(BaseModel):
    destination: str
    trip_health_score: TripHealthScore
    summary: str
    sections: DailyBriefSections
    recommendations: List[BriefRecommendation] = Field(default_factory=list)
    can_optimize: bool = True
    generated_at: str

class NotificationPreferences(BaseModel):
    notification_time: str = "07:00"
    alert_sensitivity: str = "high"  # low, medium, high
    morning_brief_enabled: bool = True
    critical_alerts_enabled: bool = True
    trip_score_visible: bool = True

class DeviceTokenRequest(BaseModel):
    user_id: str = "anonymous"
    device_token: str = Field(..., min_length=5)
    platform: str = "web"  # web, android, ios

class OptimizeDayRequest(BaseModel):
    session_id: Optional[str] = None
    reason: str = "WEATHER_OPTIMIZATION"  # WEATHER_OPTIMIZATION, TRAFFIC_OPTIMIZATION, MULTI_FACTOR_OPTIMIZATION
