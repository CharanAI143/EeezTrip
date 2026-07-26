from typing import List, Dict, Any
from backend.app.booking.base import BaseBookingProvider

class HotelProvider(BaseBookingProvider):
    """Hotel offer provider."""

    @property
    def category(self) -> str:
        return "hotel"

    def fetch_offers(self, destination: str) -> List[Dict[str, Any]]:
        dest = destination.strip()
        return [
            {
                "id": f"htl_{dest.lower()}_1",
                "provider": "EeezTrip Stays",
                "title": f"Grand Horizon Resort {dest}",
                "price": 7500.0,
                "currency": "INR",
                "rating": 4.8,
                "location": f"Beachfront, {dest}",
                "distance_km": 0.5,
                "travel_time_mins": 8,
                "cancellation_policy": "Free Cancellation until 24h before",
                "booking_url": f"https://eeeztrip.com/hotels/{dest.lower()}/grand-horizon"
            },
            {
                "id": f"htl_{dest.lower()}_2",
                "provider": "Boutique Hotels Network",
                "title": f"Hotel Aurora Heritage {dest}",
                "price": 5400.0,
                "currency": "INR",
                "rating": 4.6,
                "location": f"City Center, {dest}",
                "distance_km": 1.1,
                "travel_time_mins": 12,
                "cancellation_policy": "Free Cancellation",
                "booking_url": f"https://eeeztrip.com/hotels/{dest.lower()}/aurora"
            }
        ]
