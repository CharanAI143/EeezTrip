import pytest
from unittest.mock import MagicMock
from backend.app.schemas.trip import TripRequest, TripResponse, PlanRevisionRequest, CostBreakdown, DayPlan
from backend.app.services.trip_revision_service import TripRevisionService

@pytest.mark.asyncio
async def test_revise_trip_success():
    service = TripRevisionService()
    pref = TripRequest(origin="Delhi", destination="Jaipur", mood="Culture", budget=40000, days=3)
    curr = TripResponse(
        destination="Jaipur",
        title="Jaipur Heritage Tour",
        tagline="Palaces and forts",
        summary="3 days in Jaipur",
        best_time="Winter",
        highlights=["Amber Fort", "City Palace"],
        daily_plan=[
            DayPlan(day=1, title="Palaces", morning="City Palace", midday="Lunch", afternoon="Hawa Mahal", evening="Bazaar", tip="Walk")
        ],
        cozy_tips=["Tip 1"],
        must_try_food=["Dal Baati Churma"],
        estimated_cost_breakdown=CostBreakdown(
            accommodation=16000, food=10000, transport=6000, activities=5000, misc=3000
        )
    )

    req = PlanRevisionRequest(preferences=pref, current_plan=curr, instruction="Make it cheaper")
    res = await service.revise_trip(req)

    assert res.revised_plan is not None
    assert "change_summary" in res.model_dump()
    assert "reasoning" in res.model_dump()

@pytest.mark.asyncio
async def test_revise_trip_invalid_instruction():
    service = TripRevisionService()
    pref = TripRequest(origin="Delhi", destination="Jaipur", mood="Culture", budget=40000, days=3)
    curr = TripResponse(
        destination="Jaipur",
        title="Jaipur Tour",
        tagline="Tagline",
        summary="Summary",
        best_time="Winter",
        highlights=[],
        daily_plan=[],
        cozy_tips=[],
        must_try_food=[],
        estimated_cost_breakdown=CostBreakdown(accommodation=10000, food=5000, transport=3000, activities=2000, misc=0)
    )

    from pydantic import ValidationError
    with pytest.raises(ValidationError):
        PlanRevisionRequest(preferences=pref, current_plan=curr, instruction="a")
