import pytest
from backend.app.schemas.booking import BookingOffer
from backend.app.booking.savings import SavingsDetector

def test_savings_detector_finds_savings():
    detector = SavingsDetector()
    budget = {"accommodation": 10000.0, "transport": 3000.0}
    offers = [
        BookingOffer(
            id="h1", provider="P1", category="hotel", title="Budget Inn",
            price=6000.0, rating=4.5, location="Center"
        )
    ]

    opps = detector.detect_savings(budget, offers)
    assert len(opps) == 1
    assert opps[0].savings_amount == 4000.0
    assert opps[0].percentage_saved == 40.0
