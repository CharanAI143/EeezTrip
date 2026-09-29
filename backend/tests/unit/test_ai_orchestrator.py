import pytest

from backend.app.schemas.trip import CostBreakdown, DayPlan, TripRequest, TripResponse
from backend.app.services.ai_orchestrator import AIOrchestrator


@pytest.fixture
def orchestrator():
    return AIOrchestrator()


def _cost_total(response: TripResponse) -> int:
    cb = response.estimated_cost_breakdown
    return cb.accommodation + cb.food + cb.transport + cb.activities + cb.misc


def test_normalise_plan_fills_missing_days(orchestrator):
    payload = {
        "title": "Kerala",
        "daily_plan": [{"day": 1, "morning": "Houseboat check-in"}],
    }
    plan = orchestrator.normalise_plan(payload, days=4, budget=40000, destination="Kerala")

    assert [day.day for day in plan.daily_plan] == [1, 2, 3, 4]
    assert plan.daily_plan[0].midday  # missing slot was filled
    assert plan.daily_plan[3].tip


def test_normalise_plan_coerces_string_cost_fields(orchestrator):
    payload = {
        "title": "Goa",
        "estimated_cost_breakdown": {"accommodation": "12000", "food": 5000, "misc": None},
    }
    plan = orchestrator.normalise_plan(payload, days=2, budget=30000, destination="Goa")

    assert plan.estimated_cost_breakdown.accommodation == 12000
    assert plan.estimated_cost_breakdown.food == 5000
    assert _cost_total(plan) == 30000


def test_normalise_plan_always_matches_budget(orchestrator):
    payload = {
        "title": "Tokyo",
        "estimated_cost_breakdown": {
            "accommodation": 90000,
            "food": 40000,
            "transport": 10000,
            "activities": 5000,
            "misc": 0,
        },
    }
    plan = orchestrator.normalise_plan(payload, days=2, budget=50000, destination="Tokyo")

    assert _cost_total(plan) == 50000
    assert all(v >= 0 for v in plan.estimated_cost_breakdown.model_dump().values())


def test_normalise_plan_unwraps_nested_payload(orchestrator):
    payload = {"revised_plan": {"title": "Paris", "daily_plan": [{"day": 1, "morning": "Seine walk"}]}}
    plan = orchestrator.normalise_plan(payload, days=2, budget=10000, destination="Paris")

    assert plan.title == "Paris"
    assert plan.destination == "Paris"
    assert len(plan.daily_plan) == 2


def test_normalise_plan_repairs_string_lists(orchestrator):
    plan = orchestrator.normalise_plan(
        {"title": "Rome", "highlights": "Colosseum", "cozy_tips": None},
        days=1,
        budget=5000,
        destination="Rome",
    )

    assert plan.highlights == ["Colosseum"]
    assert plan.cozy_tips == []


def test_normalise_plan_supplies_missing_text_fields(orchestrator):
    plan = orchestrator.normalise_plan({"title": "   "}, days=1, budget=5000, destination="Rome")

    assert plan.title.strip()
    assert plan.tagline.strip()
    assert plan.summary.strip()
    assert plan.best_time.strip()


def test_normalise_plan_renumbers_out_of_order_days(orchestrator):
    payload = {"title": "Rome", "daily_plan": [{"day": 3, "morning": "a"}, {"day": 1, "morning": "b"}]}
    plan = orchestrator.normalise_plan(payload, days=2, budget=5000, destination="Rome")

    assert [d.day for d in plan.daily_plan] == [1, 2]
    assert plan.daily_plan[0].morning == "b"


def test_generation_falls_back_when_all_providers_fail(orchestrator, monkeypatch):
    monkeypatch.setattr(orchestrator, "provider_names", ["gemini"])
    monkeypatch.setattr("backend.app.providers.ai.factory.GeminiProvider.is_available", lambda self: False)

    plan = orchestrator.generate_trip_recommendation(TripRequest(destination="Bali", days=3, budget=50000))

    assert len(plan.daily_plan) == 3
    assert _cost_total(plan) == 50000


def test_generation_uses_first_available_provider(orchestrator, monkeypatch):
    monkeypatch.setattr(orchestrator, "provider_names", ["gemini", "ollama"])
    monkeypatch.setattr("backend.app.providers.ai.factory.GeminiProvider.is_available", lambda self: True)
    monkeypatch.setattr(
        "backend.app.providers.ai.factory.GeminiProvider.generate_structured_json",
        lambda self, prompt, schema: {
            "title": "Bali Escape",
            "daily_plan": [{"day": 1, "morning": "Ubud rice terraces"}],
        },
    )

    plan = orchestrator.generate_trip_recommendation(TripRequest(destination="Bali", days=2, budget=50000))

    assert plan.title == "Bali Escape"
    assert len(plan.daily_plan) == 2
    assert _cost_total(plan) == 50000


def test_generation_skips_provider_that_raises(orchestrator, monkeypatch):
    monkeypatch.setattr(orchestrator, "provider_names", ["gemini", "ollama"])
    monkeypatch.setattr("backend.app.providers.ai.factory.GeminiProvider.is_available", lambda self: True)
    monkeypatch.setattr("backend.app.providers.ai.factory.OllamaProvider.is_available", lambda self: True)

    def boom(self, prompt, schema):
        raise RuntimeError("rate limited")

    monkeypatch.setattr("backend.app.providers.ai.factory.GeminiProvider.generate_structured_json", boom)
    monkeypatch.setattr(
        "backend.app.providers.ai.factory.OllamaProvider.generate_structured_json",
        lambda self, prompt, schema: {
            "title": "Bali from Ollama",
            "daily_plan": [{"day": 1, "morning": "Sunrise trek"}],
        },
    )

    plan = orchestrator.generate_trip_recommendation(TripRequest(destination="Bali", days=1, budget=20000))

    assert plan.title == "Bali from Ollama"


def test_generation_falls_back_on_malformed_provider_payload(orchestrator, monkeypatch):
    monkeypatch.setattr(orchestrator, "provider_names", ["gemini"])
    monkeypatch.setattr("backend.app.providers.ai.factory.GeminiProvider.is_available", lambda self: True)
    monkeypatch.setattr(
        "backend.app.providers.ai.factory.GeminiProvider.generate_structured_json",
        lambda self, prompt, schema: "I am not JSON at all",
    )

    plan = orchestrator.generate_trip_recommendation(TripRequest(destination="Bali", days=2, budget=25000))

    assert len(plan.daily_plan) == 2
    assert _cost_total(plan) == 25000


def test_day_count_alignment_repeats_last_day(orchestrator):
    req = TripRequest(destination="Bali", days=5, budget=10000)
    plan = orchestrator._generate_fallback_response(req, "Bali")
    plan.daily_plan = plan.daily_plan[:2]

    from backend.app.services.trip_recommendation_service import TripRecommendationService
    TripRecommendationService()._align_day_count(plan, 5)

    assert [d.day for d in plan.daily_plan] == [1, 2, 3, 4, 5]
    assert all(isinstance(d, DayPlan) for d in plan.daily_plan)


def test_cost_alignment_scales_down_when_categories_exceed_budget():
    from backend.app.services.trip_recommendation_service import TripRecommendationService

    response = TripResponse(
        title="Test",
        tagline="t",
        summary="s",
        best_time="b",
        highlights=[],
        daily_plan=[DayPlan(day=1, title="d", morning="m", midday="md", afternoon="a", evening="e", tip="t")],
        cozy_tips=[],
        must_try_food=[],
        estimated_cost_breakdown=CostBreakdown(accommodation=9000, food=5000, transport=2000, activities=1000, misc=0),
    )

    TripRecommendationService()._align_cost_breakdown(response, 10000)

    assert (
        response.estimated_cost_breakdown.accommodation
        + response.estimated_cost_breakdown.food
        + response.estimated_cost_breakdown.transport
        + response.estimated_cost_breakdown.activities
        + response.estimated_cost_breakdown.misc
    ) == 10000
