from typing import Tuple, List
from backend.app.personalization.schemas import (
    UserPreferenceProfile, PreferenceItem, PreferenceHistoryEntry
)
from backend.app.personalization.behavior_tracker import BehaviorTracker

class LearningService:
    """Deterministic, transparent preference learning engine."""

    def evaluate_learning(
        self,
        profile: UserPreferenceProfile,
        tracker: BehaviorTracker
    ) -> Tuple[UserPreferenceProfile, List[PreferenceHistoryEntry]]:
        history: List[PreferenceHistoryEntry] = []
        signals = tracker.get_signal_counts()

        # Rule 1: Food Acceptance
        food_count = signals.get("food_accepted", 0)
        if food_count > 0 and profile.food_interest.source != "EXPLICIT":
            old_val = profile.food_interest.value
            new_val = min(1.0, float(old_val) + (0.05 * food_count))
            old_conf = profile.food_interest.confidence
            new_conf = min(0.95, old_conf + 0.05)

            profile.food_interest = PreferenceItem(
                value=new_val, confidence=new_conf, source="BEHAVIOR"
            )
            history.append(PreferenceHistoryEntry(
                key="food_interest",
                previous_value=old_val,
                new_value=new_val,
                previous_confidence=old_conf,
                new_confidence=new_conf,
                reason=f"Accepted {food_count} food recommendations."
            ))

        # Rule 2: Museum Rejection
        museum_rej = signals.get("museum_rejected", 0)
        if museum_rej > 0 and profile.museum_interest.source != "EXPLICIT":
            old_val = profile.museum_interest.value
            new_val = max(0.0, float(old_val) - (0.05 * museum_rej))
            old_conf = profile.museum_interest.confidence
            new_conf = min(0.95, old_conf + 0.05)

            profile.museum_interest = PreferenceItem(
                value=new_val, confidence=new_conf, source="BEHAVIOR"
            )
            history.append(PreferenceHistoryEntry(
                key="museum_interest",
                previous_value=old_val,
                new_value=new_val,
                previous_confidence=old_conf,
                new_confidence=new_conf,
                reason=f"Rejected {museum_rej} museum recommendations."
            ))

        return profile, history
