import pytest
from unittest.mock import MagicMock, AsyncMock
from backend.app.schemas.trip import TripRequest, TripResponse, CostBreakdown, DayPlan
from backend.app.services.trip_recommendation_service import TripRecommendationService

@pytest.mark.asyncio
async def test_generate_recommendation_success():
    mock_orchestrator = MagicMock()
    mock_repository = MagicMock()
    mock_repository.create_trip = AsyncMock(return_value="mock_trip_id_123")

    mock_rec = TripResponse(
        destination="Paris",
        title="Romantic Paris Escape",
        tagline="City of Lights",
        summary="A romantic 3-day getaway in Paris.",
        best_time="Spring",
        highlights=["Eiffel Tower", "Louvre", "Seine Cruise"],
        daily_plan=[
            DayPlan(day=1, title="Arrival", morning="Arrive", midday="Lunch", afternoon="Louvre", evening="Dinner", tip="Book early"),
            DayPlan(day=2, title="Exploration", morning="Walk", midday="Bistro", afternoon="Eiffel", evening="Cruise", tip="Walk"),
            DayPlan(day=3, title="Farewell", morning="Café", midday="Pastry", afternoon="Shopping", evening="Depart", tip="Enjoy")
        ],
        cozy_tips=["Tip 1", "Tip 2"],
        must_try_food=["Croissant", "Crêpe"],
        estimated_cost_breakdown=CostBreakdown(
            accommodation=20000, food=12000, transport=8000, activities=6000, misc=4000
        )
    )
    mock_orchestrator.generate_trip_recommendation.return_value = mock_rec

    service = TripRecommendationService(orchestrator=mock_orchestrator, repository=mock_repository)
    req = TripRequest(origin="London", destination="Paris", mood="Romantic", budget=50000, days=3)

    res, trip_id = await service.generate_recommendation(req)

    assert res.destination == "Paris"
    assert trip_id == "mock_trip_id_123"
    assert res.estimated_cost_breakdown.misc == 4000
    mock_orchestrator.generate_trip_recommendation.assert_called_once_with(req)

@pytest.mark.asyncio
async def test_business_rule_invalid_budget():
    service = TripRecommendationService()
    req = TripRequest(origin="London", destination="Paris", mood="Romantic", budget=-100, days=3)

    with pytest.raises(ValueError, match="Budget must be a positive integer greater than zero."):
        await service.generate_recommendation(req)

@pytest.mark.asyncio
async def test_business_rule_invalid_days():
    service = TripRecommendationService()
    req = TripRequest(origin="London", destination="Paris", mood="Romantic", budget=50000, days=0)

    with pytest.raises(ValueError, match="Trip duration must be between 1 and 14 days."):
        await service.generate_recommendation(req)
