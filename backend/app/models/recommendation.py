from typing import Dict, Any

class RecommendationModel:
    """Placeholder persistence model for Destination Recommendation entity."""
    def __init__(self, name: str, mood: str, cost: int):
        self.name = name
        self.mood = mood
        self.estimated_cost = cost

    def to_dict(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "mood": self.mood,
            "estimated_cost": self.estimated_cost,
        }
