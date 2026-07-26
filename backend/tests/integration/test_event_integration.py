import pytest
from backend.app.schemas.trip import TripRequest
from backend.app.services.trip_recommendation_service import TripRecommendationService
from backend.app.services.audit_service import audit_service
from backend.app.services.event_handlers import register_all_event_handlers

@pytest.mark.asyncio
async def test_trip_recommendation_publishes_event_to_audit_trail():
    register_all_event_handlers()
    service = TripRecommendationService()

    req = TripRequest(origin="Bangalore", destination="Goa", mood="Relaxed", budget=30000, days=3)
    rec, trip_id = await service.generate_recommendation(req)

    trail = audit_service.get_audit_trail()
    assert any(log["event_name"] == "TripCreated" for log in trail)
