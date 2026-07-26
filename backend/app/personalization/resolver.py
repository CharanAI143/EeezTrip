from typing import Dict, Any, Optional
from backend.app.personalization.schemas import UserPreferenceProfile

class PreferenceResolver:
    """Combines explicit, behavioral, session, and context preferences."""

    def resolve_profile(
        self,
        base_profile: UserPreferenceProfile,
        session_overrides: Optional[Dict[str, Any]] = None,
        explicit_overrides: Optional[Dict[str, Any]] = None,
    ) -> UserPreferenceProfile:
        resolved = base_profile.model_copy(deep=True)

        if session_overrides:
            if "mood" in session_overrides:
                mood = session_overrides["mood"].lower()
                if "relax" in mood:
                    resolved.activity_pacing.value = "relaxed"
                elif "adventure" in mood:
                    resolved.activity_pacing.value = "fast"

        if explicit_overrides:
            for k, v in explicit_overrides.items():
                if hasattr(resolved, k):
                    item = getattr(resolved, k)
                    if hasattr(item, "value"):
                        item.value = v
                        item.source = "EXPLICIT"
                        item.confidence = 1.0

        return resolved
