import pytest
from unittest.mock import MagicMock
from backend.app.services.travel_intelligence_service import TravelIntelligenceService
from backend.app.services.travel_insight_service import TravelInsightService

def test_travel_insight_service_synthesizes_insights():
    service = TravelInsightService()
    weather_data = {"destination": "Goa", "is_rainy": True, "temp_max": 28.0}
    places_data = [{
        "category": "transit",
        "title": "Prefer Metro Transit",
        "message": "Heavy traffic",
        "badge": "Transit",
        "severity": "info"
    }]

    insights = service.synthesize_insights("Goa", weather_data, places_data)
    assert len(insights) >= 2
    assert any(i.category == "weather" and "Rain" in i.title for i in insights)

def test_travel_intelligence_service_get_intelligence():
    mock_weather = MagicMock()
    mock_weather.fetch_forecast.return_value = {"destination": "Jaipur", "is_rainy": False, "temp_max": 30.0}

    mock_places = MagicMock()
    mock_places.fetch_place_insights.return_value = []

    service = TravelIntelligenceService(weather_provider=mock_weather, places_provider=mock_places)
    res = service.get_intelligence("Jaipur")

    assert res.destination == "Jaipur"
    assert len(res.insights) > 0
