from typing import Dict, Any, List

class ItineraryModel:
    """Placeholder persistence model for Itinerary entity."""
    def __init__(self, trip_id: str, title: str, daily_plan: List[Dict[str, Any]]):
        self.trip_id = trip_id
        self.title = title
        self.daily_plan = daily_plan

    def to_dict(self) -> Dict[str, Any]:
        return {
            "trip_id": self.trip_id,
            "title": self.title,
            "daily_plan": self.daily_plan,
        }
