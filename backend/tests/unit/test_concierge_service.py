import pytest
from backend.app.schemas.concierge import ConciergeRequest, IntentType
from backend.app.services.concierge_service import ConciergeService

@pytest.mark.asyncio
async def test_concierge_service_weather_query():
    service = ConciergeService()
    req = ConciergeRequest(query="What is the weather forecast for Goa?")
    res = await service.handle_concierge_request(req)

    assert res.detected_intent == IntentType.WEATHER_QUESTION
    assert "Goa" in res.reply
    assert res.action_taken is not None

@pytest.mark.asyncio
async def test_concierge_service_packing_query():
    service = ConciergeService()
    req = ConciergeRequest(query="What clothes should I pack?")
    res = await service.handle_concierge_request(req)

    assert res.detected_intent == IntentType.PACKING_ADVICE
    assert "recommend packing" in res.reply.lower() or "pack" in res.reply.lower()
