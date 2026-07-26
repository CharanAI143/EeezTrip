import pytest
from backend.app.schemas.booking import BookingOffer
from backend.app.booking.ranker import OfferRanker

def test_offer_ranker_ranks_higher_rated_and_cheaper_offer_first():
    ranker = OfferRanker()
    offer_expensive = BookingOffer(
        id="h1", provider="P1", category="hotel", title="Expensive Hotel",
        price=14000.0, rating=3.5, location="Center"
    )
    offer_cheaper_better = BookingOffer(
        id="h2", provider="P2", category="hotel", title="Great Value Hotel",
        price=5000.0, rating=4.8, location="Center", cancellation_policy="Free Cancellation"
    )

    ranked = ranker.rank_offers([offer_expensive, offer_cheaper_better])
    assert ranked[0].id == "h2"
