import pytest
from backend.app.services.rule_evaluator import RuleEvaluator
from backend.app.schemas.daily_brief import RecommendationSeverity

def test_rule_evaluator_evaluates_rain_rule():
    evaluator = RuleEvaluator()
    weather_data = {"is_rainy": True, "temp_max": 28.0}
    places_data = []

    recs = evaluator.evaluate_all("Goa", {}, weather_data, places_data)
    assert len(recs) >= 1
    assert any(r.severity == RecommendationSeverity.CRITICAL for r in recs)

def test_rule_evaluator_evaluates_transit_rule():
    evaluator = RuleEvaluator()
    weather_data = {"is_rainy": False, "temp_max": 25.0}
    places_data = [{
        "category": "transit",
        "title": "Heavy Surface Traffic",
        "message": "Transit advisory active.",
        "badge": "Transit",
        "severity": "info"
    }]

    recs = evaluator.evaluate_all("Goa", {}, weather_data, places_data)
    assert len(recs) >= 1
    assert any(r.severity == RecommendationSeverity.IMPORTANT for r in recs)
