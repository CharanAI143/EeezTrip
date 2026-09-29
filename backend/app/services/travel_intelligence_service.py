from typing import Any, Dict, Optional
from backend.app.providers.live_data.aggregator import LiveDataAggregator
from backend.app.services.travel_insight_service import TravelInsightService
from backend.app.schemas.intelligence import TravelIntelligenceResponse

class TravelIntelligenceService:
    """Unified Travel Intelligence Platform routing via LiveDataAggregator."""

    def __init__(
        self,
        aggregator: Optional[LiveDataAggregator] = None,
        insight_service: Optional[TravelInsightService] = None,
        # Backward-compatible parameters
        weather_provider: Optional[Any] = None,
        places_provider: Optional[Any] = None,
    ):
        self.aggregator = aggregator or LiveDataAggregator()
        self.insight_service = insight_service or TravelInsightService()

    def get_intelligence(self, destination: str) -> TravelIntelligenceResponse:
        """Fetch normalized cached travel data via LiveDataAggregator and synthesize insights."""
        dest = destination.strip() or "Goa"
        weather_data = self._normalise_weather(self.aggregator.get_live_data("weather", dest))
        places_res = self.aggregator.get_live_data("places", dest)

        places_data = places_res.get("places_insights", [])
        insights = self.insight_service.synthesize_insights(dest, weather_data, places_data)

        return TravelIntelligenceResponse(
            destination=dest,
            weather_summary=weather_data,
            insights=insights
        )

    @staticmethod
    def _normalise_weather(raw: Dict[str, Any]) -> Dict[str, Any]:
        """Map provider-specific weather keys onto the canonical contract consumers expect.

        Consumers (ConciergeResponseBuilder, TravelInsightService) read `temp_max`,
        `temp_min` and `is_rainy`; some providers only return `temperature_max`/`temperature_min`.
        """
        if not isinstance(raw, dict):
            return {"temp_max": 28, "temp_min": 20, "is_rainy": False, "condition": "Unknown"}

        data = dict(raw)
        aliases = {
            "temp_max": ("temperature_max", "temperature_2m_max", "max_temp"),
            "temp_min": ("temperature_min", "temperature_2m_min", "min_temp"),
            "is_rainy": ("is_rain", "rain", "needs_alternatives"),
        }
        for canonical, candidates in aliases.items():
            if canonical in data:
                continue
            for candidate in candidates:
                if candidate in data:
                    data[canonical] = data[candidate]
                    break

        try:
            data["temp_max"] = float(data.get("temp_max", 28))
            data["temp_min"] = float(data.get("temp_min", 20))
        except (TypeError, ValueError):
            data["temp_max"] = 28.0
            data["temp_min"] = 20.0

        if not data.get("is_rainy"):
            data["is_rainy"] = str(data.get("condition", "")).lower() in {
                "rainy", "rain", "drizzle", "showers", "thunderstorm", "snow",
            }
        return data
