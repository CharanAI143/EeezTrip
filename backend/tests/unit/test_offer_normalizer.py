import pytest
from backend.app.booking.normalizer import OfferNormalizer

def test_offer_normalizer_normalizes_raw_hotel():
    raw = {
        "id": "h_100",
        "provider": "TestStays",
        "name": "Grand Hotel",
        "price": 6000,
        "currency": "INR",
        "rating": 4.7
    }
    offer = OfferNormalizer.normalize("hotel", raw)

    assert offer.id == "h_100"
    assert offer.category == "hotel"
    assert offer.title == "Grand Hotel"
    assert offer.price == 6000.0
    assert offer.rating == 4.7
