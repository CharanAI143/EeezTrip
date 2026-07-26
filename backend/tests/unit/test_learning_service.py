import pytest
from backend.app.personalization.schemas import UserPreferenceProfile
from backend.app.personalization.behavior_tracker import BehaviorTracker
from backend.app.personalization.learning_service import LearningService

def test_learning_service_updates_scores_deterministically():
    profile = UserPreferenceProfile()
    tracker = BehaviorTracker()
    service = LearningService()

    tracker.record_signal("food_accepted", 3)
    tracker.record_signal("museum_rejected", 2)

    updated, history = service.evaluate_learning(profile, tracker)

    assert len(history) == 2
    assert updated.food_interest.value > 0.85
    assert updated.museum_interest.value < 0.50
