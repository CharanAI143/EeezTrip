from typing import Dict, Any
from backend.app.schemas.booking import BookingOffer

class OfferNormalizer:
    """Normalizes raw third-party booking provider data into unified internal BookingOffer objects."""

    @staticmethod
    def normalize(category: str, raw_data: Dict[str, Any]) -> BookingOffer:
        offer_id = str(raw_data.get("id") or raw_data.get("offer_id") or f"off_{hash(str(raw_data))}")
        provider = raw_data.get("provider", "EeezTrip Partner")
        title = raw_data.get("title") or raw_data.get("name") or "Special Offer"
        price = float(raw_data.get("price") or raw_data.get("cost") or 0.0)
        currency = raw_data.get("currency", "INR")
        rating = float(raw_data.get("rating", 4.5))
        location = raw_data.get("location") or raw_data.get("city") or "Central"
        dist = float(raw_data.get("distance_km", 1.2))
        t_time = int(raw_data.get("travel_time_mins", 15))
        cancellation = raw_data.get("cancellation_policy", "Free Cancellation")
        booking_url = raw_data.get("booking_url", "https://eeeztrip.com/partner-deal")

        return BookingOffer(
            id=offer_id,
            provider=provider,
            category=category,
            title=title,
            price=price,
            currency=currency,
            rating=rating,
            location=location,
            distance_from_itinerary_km=dist,
            travel_time_mins=t_time,
            cancellation_policy=cancellation,
            booking_url=booking_url,
            metadata=raw_data
        )
