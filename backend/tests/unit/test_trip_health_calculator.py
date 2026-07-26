import pytest
from backend.app.services.trip_health_calculator import TripHealthCalculator
from backend.app.schemas.daily_brief import BriefRecommendation, RecommendationSeverity

def test_trip_health_calculator_optimal_score():
    calc = TripHealthCalculator()
    weather_data = {"is_rainy": False, "temp_max": 25.0}
    health = calc.calculate_score(weather_data, [])

    assert health.score == 100
    assert health.improvement_delta == 0

def test_trip_health_calculator_deductions_for_rain_and_critical_recs():
    calc = TripHealthCalculator()
    weather_data = {"is_rainy": True, "temp_max": 28.0}
    recs = [
        BriefRecommendation(
            title="Severe Weather Alert",
            description="Rain forecast",
            severity=RecommendationSeverity.CRITICAL,
            action_type="weather_opt"
        )
    ]
    health = calc.calculate_score(weather_data, recs)

    assert health.score < 80
    assert health.improvement_delta > 20
