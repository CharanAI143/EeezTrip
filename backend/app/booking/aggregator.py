from typing import List, Dict, Any, Optional
from backend.app.providers.live_data.cache import LiveDataCache
from backend.app.booking.base import BaseBookingProvider
from backend.app.booking.normalizer import OfferNormalizer
from backend.app.booking.hotel_provider import HotelProvider
from backend.app.booking.flight_provider import FlightProvider
from backend.app.booking.transport_provider import TransportProvider
from backend.app.booking.activity_provider import ActivityProvider
from backend.app.schemas.booking import BookingOffer

class BookingAggregator:
    """Aggregates booking offers across multiple supply categories with caching."""

    def __init__(
        self,
        cache: Optional[LiveDataCache] = None,
        providers: Optional[List[BaseBookingProvider]] = None,
    ):
        self.cache = cache or LiveDataCache(ttls={"booking": 3600})
        self.providers = providers or [
            HotelProvider(),
            FlightProvider(),
            TransportProvider(),
            ActivityProvider()
        ]

    def aggregate_offers(self, destination: str) -> List[BookingOffer]:
        """Aggregate and normalize offers across all registered providers."""
        dest = destination.strip() or "Goa"
        cache_key = f"booking:{dest.lower()}"

        cached = self.cache.get("places", cache_key)
        if cached:
            return [BookingOffer(**item) for item in cached]

        all_normalized: List[BookingOffer] = []
        for provider in self.providers:
            try:
                raw_offers = provider.fetch_offers(dest)
                for raw in raw_offers:
                    norm = OfferNormalizer.normalize(provider.category, raw)
                    all_normalized.append(norm)
            except Exception as exc:
                print(f"[BookingAggregator] Provider '{provider.category}' error: {exc}")

        # Save normalized offers to cache
        self.cache.set("places", cache_key, [o.model_dump() for o in all_normalized])
        return all_normalized
