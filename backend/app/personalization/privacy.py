from typing import Dict, Any, Optional
from backend.app.personalization.schemas import UserPreferenceProfile, PrivacySettings

class PrivacyService:
    """Privacy controls governing preference visibility, editing, and data reset."""

    def __init__(self):
        self.settings = PrivacySettings()

    def update_settings(self, learning_enabled: Optional[bool] = None) -> PrivacySettings:
        if learning_enabled is not None:
            self.settings.learning_enabled = learning_enabled
        return self.settings

    def reset_profile(self) -> UserPreferenceProfile:
        """Reset profile to clean default baseline."""
        return UserPreferenceProfile()

    def export_profile(self, profile: UserPreferenceProfile) -> Dict[str, Any]:
        """Export user preference profile in transparent JSON format."""
        return {
            "privacy_settings": self.settings.model_dump(),
            "profile": profile.model_dump(),
            "export_notice": "EeezTrip is transparent and privacy-first. All learned preferences can be edited or deleted."
        }
