from typing import List, Dict, Any
from backend.app.booking.base import BaseBookingProvider

class FlightProvider(BaseBookingProvider):
    """Flight deal offer provider."""

    @property
    def category(self) -> str:
        return "flight"

    def fetch_offers(self, destination: str) -> List[Dict[str, Any]]:
        dest = destination.strip()
        return [
            {
                "id": f"flt_{dest.lower()}_1",
                "provider": "SkyConnect Airlines",
                "title": f"Morning Non-Stop Flight to {dest}",
                "price": 4200.0,
                "currency": "INR",
                "rating": 4.7,
                "location": f"BLR to {dest[:3].upper()}",
                "distance_km": 0.0,
                "travel_time_mins": 75,
                "cancellation_policy": "Flexible rebooking",
                "booking_url": f"https://eeeztrip.com/flights/{dest.lower()}/morning-direct"
            }
        ]
