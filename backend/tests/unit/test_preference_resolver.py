import pytest
from backend.app.personalization.schemas import UserPreferenceProfile
from backend.app.personalization.resolver import PreferenceResolver

def test_preference_resolver_overrides():
    resolver = PreferenceResolver()
    base = UserPreferenceProfile()

    resolved = resolver.resolve_profile(
        base,
        session_overrides={"mood": "Adventure & Exploration"},
        explicit_overrides={"budget_level": "luxury"}
    )

    assert resolved.activity_pacing.value == "fast"
    assert resolved.budget_level.value == "luxury"
    assert resolved.budget_level.source == "EXPLICIT"
