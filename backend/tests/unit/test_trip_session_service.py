import pytest
from unittest.mock import MagicMock, AsyncMock
from backend.app.schemas.trip import TripRequest, TripResponse, CostBreakdown
from backend.app.services.trip_session_service import TripSessionService

@pytest.mark.asyncio
async def test_trip_session_service_create_and_get():
    mock_repo = MagicMock()
    mock_repo.create_session = AsyncMock(return_value={
        "session_id": "session_123",
        "user_id": "anonymous",
        "preferences": {"destination": "Goa"},
        "current_itinerary": {"title": "Goa Trip"},
        "revision_history": [],
        "created_at": "2026-07-26T00:00:00Z",
        "updated_at": "2026-07-26T00:00:00Z"
    })
    mock_repo.get_session = AsyncMock(return_value={
        "session_id": "session_123",
        "user_id": "anonymous",
        "preferences": {"destination": "Goa"},
        "current_itinerary": {"title": "Goa Trip"},
        "revision_history": [],
        "created_at": "2026-07-26T00:00:00Z",
        "updated_at": "2026-07-26T00:00:00Z"
    })

    service = TripSessionService(repository=mock_repo)
    pref = TripRequest(origin="Bangalore", destination="Goa", mood="Relaxed", budget=30000, days=3)
    rec = TripResponse(
        destination="Goa", title="Goa Trip", tagline="Tagline", summary="Summary",
        best_time="Spring", highlights=[], daily_plan=[], cozy_tips=[], must_try_food=[],
        estimated_cost_breakdown=CostBreakdown(accommodation=10000, food=5000, transport=3000, activities=2000, misc=0)
    )

    created = await service.create_session("anonymous", pref, rec)
    assert created["session_id"] == "session_123"

    fetched = await service.get_session("session_123")
    assert fetched["session_id"] == "session_123"
