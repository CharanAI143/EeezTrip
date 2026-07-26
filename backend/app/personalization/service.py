from typing import Dict, Any, Optional, List, Tuple
from backend.app.personalization.schemas import (
    UserPreferenceProfile, PreferenceHistoryEntry, RecommendationExplanation
)
from backend.app.personalization.behavior_tracker import BehaviorTracker
from backend.app.personalization.learning_service import LearningService
from backend.app.personalization.resolver import PreferenceResolver
from backend.app.personalization.personalizer import RecommendationPersonalizer
from backend.app.personalization.history import PreferenceHistoryTracker
from backend.app.personalization.privacy import PrivacyService
from backend.app.events.bus import event_bus
from backend.app.events.domain_events import LearningCompleted, ProfileChanged

class PersonalizationEngine:
    """Flagship Personalization & Learning Platform."""

    def __init__(self):
        self.profile = UserPreferenceProfile()
        self.tracker = BehaviorTracker()
        self.learning_service = LearningService()
        self.resolver = PreferenceResolver()
        self.personalizer = RecommendationPersonalizer()
        self.history_tracker = PreferenceHistoryTracker()
        self.privacy_service = PrivacyService()

    def get_profile(self) -> UserPreferenceProfile:
        return self.profile

    def update_explicit_preference(self, key: str, value: Any) -> UserPreferenceProfile:
        """Update explicit user preference (overrides inferred/behavioral scores)."""
        if hasattr(self.profile, key):
            item = getattr(self.profile, key)
            if hasattr(item, "value"):
                item.value = value
                item.source = "EXPLICIT"
                item.confidence = 1.0

        event_bus.publish(ProfileChanged(user_id=self.profile.user_id, aggregate_id=self.profile.user_id))
        return self.profile

    def trigger_learning_cycle(self) -> UserPreferenceProfile:
        """Run deterministic learning evaluation on accumulated behavior signals."""
        if not self.privacy_service.settings.learning_enabled:
            return self.profile

        updated_profile, new_history = self.learning_service.evaluate_learning(self.profile, self.tracker)
        self.profile = updated_profile

        for entry in new_history:
            self.history_tracker.record_entry(entry)

        if new_history:
            event_bus.publish(LearningCompleted(
                user_id=self.profile.user_id,
                updates_count=len(new_history),
                aggregate_id=self.profile.user_id
            ))

        return self.profile

    def personalize_itinerary(
        self,
        days: List[Dict[str, Any]],
        session_overrides: Optional[Dict[str, Any]] = None
    ) -> Tuple[List[Dict[str, Any]], List[RecommendationExplanation]]:
        resolved = self.resolver.resolve_profile(self.profile, session_overrides)
        return self.personalizer.personalize_itinerary_days(days, resolved)

    def reset_profile(self) -> UserPreferenceProfile:
        self.profile = self.privacy_service.reset_profile()
        event_bus.publish(ProfileChanged(user_id=self.profile.user_id, aggregate_id=self.profile.user_id))
        return self.profile
