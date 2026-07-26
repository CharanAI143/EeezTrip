from typing import Dict, Any, Optional
import time

from backend.app.providers.live_data.cache import LiveDataCache
from backend.app.providers.live_data.registry import ProviderRegistry
from backend.app.providers.live_data.weather_provider import LiveWeatherProvider
from backend.app.providers.live_data.places_provider import LivePlacesProvider
from backend.app.providers.live_data.events_provider import LiveEventsProvider
from backend.app.providers.live_data.currency_provider import LiveCurrencyProvider
from backend.app.events.bus import event_bus
from backend.app.events.domain_events import WeatherChanged, ExchangeRateUpdated

class LiveDataAggregator:
    """Unified Live Travel Data Platform aggregator serving cached, fresh travel data."""

    def __init__(
        self,
        cache: Optional[LiveDataCache] = None,
        registry: Optional[ProviderRegistry] = None,
    ):
        self.cache = cache or LiveDataCache()
        self.registry = registry or ProviderRegistry()
        self._initialize_default_providers()

    def _initialize_default_providers(self) -> None:
        if not self.registry.get_provider("weather"):
            self.registry.register(LiveWeatherProvider())
        if not self.registry.get_provider("places"):
            self.registry.register(LivePlacesProvider())
        if not self.registry.get_provider("events"):
            self.registry.register(LiveEventsProvider())
        if not self.registry.get_provider("currency"):
            self.registry.register(LiveCurrencyProvider())

    def get_live_data(self, category: str, key: str) -> Dict[str, Any]:
        """Serve cached data if fresh; otherwise query provider, update cache, and emit events."""
        cached_value = self.cache.get(category, key)
        if cached_value:
            cached_value["is_cached"] = True
            return cached_value

        provider = self.registry.get_provider(category)
        if not provider:
            return {"category": category, "key": key, "is_cached": False, "data": {}}

        # Retry logic with failure fallback
        data = None
        for attempt in range(2):
            try:
                data = provider.fetch_data(key)
                if data:
                    break
            except Exception as exc:
                print(f"[LiveDataAggregator] Provider '{category}' attempt {attempt+1} failed: {exc}")

        if not data:
            data = {"status": "fallback", "key": key}

        data["is_cached"] = False
        data["fetched_at"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

        # Save to Cache
        self.cache.set(category, key, data)

        # Event Publishing
        self._publish_live_events(category, key, data)

        return data

    def _publish_live_events(self, category: str, key: str, data: Dict[str, Any]) -> None:
        try:
            if category == "weather" and "condition" in data:
                event_bus.publish(WeatherChanged(
                    destination=key,
                    condition=data.get("condition", "Clear"),
                    aggregate_id=key
                ))
            elif category == "currency":
                event_bus.publish(ExchangeRateUpdated(
                    user_id="anonymous",
                    notification_type="currency_update",
                    title=f"Exchange rates updated for {key}",
                    aggregate_id=key
                ))
        except Exception as exc:
            print(f"[LiveDataAggregator] Event publish note: {exc}")
