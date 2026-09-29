import json

import pytest

from backend.app.schemas.trip import (
    CostBreakdown,
    DayPlan,
    PlanRevisionRequest,
    PlanRevisionResponse,
    TripRequest,
    TripResponse,
)
from backend.app.services.trip_revision_service import TripRevisionService


def _plan(days: int = 2, budget: int = 10000) -> TripResponse:
    return TripResponse(
        destination="Bali",
        title="Bali Getaway",
        tagline="t",
        summary="s",
        best_time="b",
        highlights=["h1"],
        daily_plan=[
            DayPlan(
                day=index,
                title=f"Day {index}",
                morning="m",
                midday="md",
                afternoon="a",
                evening="e",
                tip="t",
            )
            for index in range(1, days + 1)
        ],
        cozy_tips=["c"],
        must_try_food=["f1"],
        estimated_cost_breakdown=CostBreakdown(
            accommodation=4000, food=2500, transport=1500, activities=1200, misc=800
        ),
    )


def _request(instruction: str, days: int = 2) -> PlanRevisionRequest:
    return PlanRevisionRequest(
        preferences=TripRequest(destination="Bali", days=days, budget=10000),
        current_plan=_plan(days=days),
        instruction=instruction,
    )


def _cost_total(plan: TripResponse) -> int:
    cb = plan.estimated_cost_breakdown
    return cb.accommodation + cb.food + cb.transport + cb.activities + cb.misc


@pytest.mark.asyncio
async def test_revision_uses_provider_payload(monkeypatch):
    service = TripRevisionService()
    monkeypatch.setattr(
        "backend.app.providers.ai.factory.GeminiProvider.is_available", lambda self: True
    )
    monkeypatch.setattr(
        "backend.app.providers.ai.factory.GeminiProvider.generate_structured_json",
        lambda self, prompt, schema: {
            "revised_plan": {"title": "Bali Revised", "daily_plan": [{"day": 1, "morning": " trek"}]},
            "change_summary": "Swapped day 1 for a sunrise trek.",
            "reasoning": "Matches the cheaper instruction.",
        },
    )

    res = await service.revise_trip(_request("Make it cheaper"))

    assert isinstance(res, PlanRevisionResponse)
    assert res.revised_plan.title == "Bali Revised"
    assert res.change_summary == "Swapped day 1 for a sunrise trek."
    assert len(res.revised_plan.daily_plan) == 2


@pytest.mark.asyncio
async def test_revision_falls_back_to_deterministic_when_provider_fails(monkeypatch):
    service = TripRevisionService()
    monkeypatch.setattr(
        "backend.app.providers.ai.factory.GeminiProvider.is_available", lambda self: False
    )

    res = await service.revise_trip(_request("Make it cheaper"))

    assert res.revised_plan.estimated_cost_breakdown.accommodation == 3200
    assert _cost_total(res.revised_plan) == 10000


@pytest.mark.asyncio
async def test_revision_food_instruction_adds_experiences(monkeypatch):
    service = TripRevisionService()
    monkeypatch.setattr(
        "backend.app.providers.ai.factory.GeminiProvider.is_available", lambda self: False
    )

    res = await service.revise_trip(_request("Add more food stops"))

    assert "Local Street Food Tasting Tour" in res.revised_plan.must_try_food


@pytest.mark.asyncio
async def test_revision_extends_day_count_on_request(monkeypatch):
    service = TripRevisionService()
    monkeypatch.setattr(
        "backend.app.providers.ai.factory.GeminiProvider.is_available", lambda self: False
    )

    res = await service.revise_trip(_request("Extend the trip by adding days", days=4))

    assert len(res.revised_plan.daily_plan) == 4
    assert [d.day for d in res.revised_plan.daily_plan] == [1, 2, 3, 4]


@pytest.mark.asyncio
async def test_revision_rejects_short_instruction():
    with pytest.raises(ValueError):
        await TripRevisionService().revise_trip(_request("ab"))


@pytest.mark.asyncio
async def test_revision_tolerates_bare_plan_payload(monkeypatch):
    service = TripRevisionService()
    monkeypatch.setattr(
        "backend.app.providers.ai.factory.GeminiProvider.is_available", lambda self: True
    )
    monkeypatch.setattr(
        "backend.app.providers.ai.factory.GeminiProvider.generate_structured_json",
        lambda self, prompt, schema: {"title": "Bare Payload", "daily_plan": [{"day": 1, "morning": "m"}]},
    )

    res = await service.revise_trip(_request("Add a food tour"))

    assert res.revised_plan.title == "Bare Payload"
    assert res.change_summary  # synthesised when the model omits it


@pytest.mark.asyncio
async def test_revision_prompt_includes_instruction_and_plan(monkeypatch):
    service = TripRevisionService()
    captured = {}

    def capture(self, prompt, schema):
        captured["prompt"] = prompt
        return {"revised_plan": {"title": "x", "daily_plan": [{"day": 1, "morning": "m"}]}}

    monkeypatch.setattr("backend.app.providers.ai.factory.GeminiProvider.is_available", lambda self: True)
    monkeypatch.setattr("backend.app.providers.ai.factory.GeminiProvider.generate_structured_json", capture)

    await service.revise_trip(_request("Add a food tour"))

    assert "Add a food tour" in captured["prompt"]
    assert "current_plan_json" not in captured["prompt"]  # template fully substituted
    assert json.loads(captured["prompt"].split("CURRENT ITINERARY PLAN:\n")[1].split("\n\nREVISION")[0])["title"] == "Bali Getaway"
