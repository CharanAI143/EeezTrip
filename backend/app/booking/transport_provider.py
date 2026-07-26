from typing import List, Dict, Any
from backend.app.booking.base import BaseBookingProvider

class TransportProvider(BaseBookingProvider):
    """Local transit & ride-hailing offer provider."""

    @property
    def category(self) -> str:
        return "transport"

    def fetch_offers(self, destination: str) -> List[Dict[str, Any]]:
        dest = destination.strip()
        return [
            {
                "id": f"trn_{dest.lower()}_1",
                "provider": "Metro Transit Express",
                "title": f"{dest} City Metro Day Pass",
                "price": 250.0,
                "currency": "INR",
                "rating": 4.9,
                "location": f"All Lines, {dest}",
                "distance_km": 0.2,
                "travel_time_mins": 20,
                "cancellation_policy": "Instant Activation",
                "booking_url": f"https://eeeztrip.com/transit/{dest.lower()}/metro-pass"
            }
        ]
