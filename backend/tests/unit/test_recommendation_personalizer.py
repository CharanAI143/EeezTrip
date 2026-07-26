import pytest
from backend.app.personalization.schemas import UserPreferenceProfile
from backend.app.personalization.personalizer import RecommendationPersonalizer

def test_recommendation_personalizer_geographic_clustering_and_explainability():
    personalizer = RecommendationPersonalizer()
    profile = UserPreferenceProfile()

    sample_days = [
        {
            "day": 1,
            "theme": "Heritage Tour",
            "activities": [
                {"activity": "Senso-ji Temple", "neighborhood": "Asakusa"},
                {"activity": "Tokyo Skytree", "neighborhood": "Asakusa"}
            ]
        }
    ]

    p_days, explanations = personalizer.personalize_itinerary_days(sample_days, profile)

    assert len(p_days) == 1
    assert len(explanations) == 2
    assert "Asakusa" in explanations[0].reasons[1]
