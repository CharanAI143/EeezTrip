from typing import List, Dict, Any
from backend.app.schemas.intelligence import TravelInsightItem

class TravelInsightService:
    """Service converting raw environmental and venue data into actionable travel insights."""

    def synthesize_insights(
        self,
        destination: str,
        weather_data: Dict[str, Any],
        places_data: List[Dict[str, Any]]
    ) -> List[TravelInsightItem]:
        insights: List[TravelInsightItem] = []

        # Weather Intelligence Insight Rules
        if weather_data.get("is_rainy"):
            insights.append(TravelInsightItem(
                category="weather",
                title="Rain Expected During Trip",
                message=f"Moderate rain forecasted for {destination}. Keep an umbrella handy and prioritize indoor museums.",
                badge="Weather Alert",
                severity="warning"
            ))
        elif weather_data.get("temp_max", 25) > 34:
            insights.append(TravelInsightItem(
                category="weather",
                title="High Temperature Warning",
                message=f"Peak afternoon temperatures exceeding 34°C in {destination}. Stay hydrated and schedule outdoor walks early.",
                badge="Heat Note",
                severity="warning"
            ))
        else:
            insights.append(TravelInsightItem(
                category="weather",
                title="Ideal Outdoor Sightseeing Weather",
                message=f"Clear skies and mild temperatures ({weather_data.get('temp_max', 28)}°C) forecasted in {destination}.",
                badge="Weather Ideal",
                severity="success"
            ))

        # Places & Venue Intelligence Rules
        for p in places_data:
            insights.append(TravelInsightItem(
                category=p.get("category", "general"),
                title=p.get("title", "Local Advisory"),
                message=p.get("message", ""),
                badge=p.get("badge", "Notice"),
                severity=p.get("severity", "info")
            ))

        return insights
