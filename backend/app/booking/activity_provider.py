from typing import List, Dict, Any
from backend.app.booking.base import BaseBookingProvider

class ActivityProvider(BaseBookingProvider):
    """Local tour & activity offer provider."""

    @property
    def category(self) -> str:
        return "activity"

    def fetch_offers(self, destination: str) -> List[Dict[str, Any]]:
        dest = destination.strip()
        return [
            {
                "id": f"act_{dest.lower()}_1",
                "provider": "EeezTrip Experiences",
                "title": f"VIP Fast-Track Heritage & Museum Pass ({dest})",
                "price": 1200.0,
                "currency": "INR",
                "rating": 4.8,
                "location": f"Old Town, {dest}",
                "distance_km": 0.8,
                "travel_time_mins": 10,
                "cancellation_policy": "Free Cancellation up to 12h",
                "booking_url": f"https://eeeztrip.com/activities/{dest.lower()}/vip-pass"
            }
        ]
