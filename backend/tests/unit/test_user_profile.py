import pytest
from backend.app.personalization.schemas import UserPreferenceProfile

def test_user_preference_profile_defaults():
    profile = UserPreferenceProfile()
    assert profile.user_id == "anonymous"
    assert profile.food_interest.value == 0.85
    assert profile.food_interest.confidence == 0.9
    assert profile.food_interest.source == "BEHAVIOR"
