import pytest
from backend.app.booking.service import BookingIntelligenceService

def test_booking_intelligence_service_get_intelligence():
    service = BookingIntelligenceService()
    recs = service.get_booking_intelligence("Goa", {"accommodation": 10000.0, "transport": 3000.0})

    assert len(recs) >= 1
    assert "Save" in recs[0].title
    assert recs[0].savings_amount > 0
