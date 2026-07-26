from typing import Optional, Dict, Any

class TripModel:
    """Placeholder persistence model for Trip entity."""
    def __init__(self, user_id: str, destination: str, mood: str, budget: int, days: int):
        self.user_id = user_id
        self.destination = destination
        self.mood = mood
        self.budget = budget
        self.days = days
        self.status = "draft"

    def to_dict(self) -> Dict[str, Any]:
        return {
            "user_id": self.user_id,
            "destination": self.destination,
            "mood": self.mood,
            "budget": self.budget,
            "days": self.days,
            "status": self.status,
        }
