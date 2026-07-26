from pydantic import BaseModel

class FeatureFlags(BaseModel):
    """Centralized feature flag controller for gradual SaaS rollout."""
    SMART_DAILY_BRIEF: bool = True
    TRIP_HEALTH_SCORE: bool = True
    REAL_TIME_ALERTS: bool = True
    NOTIFICATION_CENTER: bool = True
    FIREBASE_PUSH: bool = True
    EVENT_BUS: bool = True
    AUDIT_TRAIL: bool = True
    ANALYTICS: bool = True

feature_flags = FeatureFlags()
