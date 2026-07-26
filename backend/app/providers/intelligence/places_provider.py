from typing import List, Dict, Any
from backend.app.providers.intelligence.base import BasePlacesProvider

class PlacesIntelligenceProvider(BasePlacesProvider):
    """Local places, festival, and venue crowd intelligence provider."""

    def fetch_place_insights(self, destination: str) -> List[Dict[str, Any]]:
        dest_lower = destination.lower()
        insights = [
            {
                "category": "transit",
                "title": "Prefer Metro Transit",
                "message": f"Heavy surface traffic expected near central {destination} during peak evening hours.",
                "badge": "Transit Tip",
                "severity": "info"
            },
            {
                "category": "ticketing",
                "title": "Book Landmark Tickets Early",
                "message": f"High visitor demand reported for top-rated heritage sights in {destination}.",
                "badge": "Pro Tip",
                "severity": "warning"
            }
        ]

        if "goa" in dest_lower:
            insights.append({
                "category": "festival",
                "title": "Local Beach Carnival",
                "message": "Sunset beach music and food festival active along north shoreline.",
                "badge": "Festival Alert",
                "severity": "success"
            })
        elif "paris" in dest_lower:
            insights.append({
                "category": "schedule",
                "title": "Museum Closure Day",
                "message": "Major state art museums closed on Mondays. Plan outdoor walks accordingly.",
                "badge": "Schedule Note",
                "severity": "info"
            })

        return insights
