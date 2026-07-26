from typing import Optional
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
        weather_data = self.aggregator.get_live_data("weather", dest)
        places_res = self.aggregator.get_live_data("places", dest)

        places_data = places_res.get("places_insights", [])
        insights = self.insight_service.synthesize_insights(dest, weather_data, places_data)

        return TravelIntelligenceResponse(
            destination=dest,
            weather_summary=weather_data,
            insights=insights
        )
