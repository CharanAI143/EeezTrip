import pytest
from backend.app.services.daily_brief_service import DailyBriefService

@pytest.mark.asyncio
async def test_daily_brief_service_generates_brief():
    service = DailyBriefService()
    brief = await service.generate_daily_brief("Goa")

    assert brief.destination == "Goa"
    assert 0 <= brief.trip_health_score.score <= 100
    assert "Good Morning" in brief.summary
    assert brief.generated_at is not None
