from typing import Dict, Any

class BudgetModel:
    """Placeholder persistence model for Budget entity."""
    def __init__(self, trip_id: str, acc: int, food: int, transport: int, act: int, misc: int):
        self.trip_id = trip_id
        self.accommodation = acc
        self.food = food
        self.transport = transport
        self.activities = act
        self.misc = misc

    def to_dict(self) -> Dict[str, Any]:
        return {
            "trip_id": self.trip_id,
            "accommodation": self.accommodation,
            "food": self.food,
            "transport": self.transport,
            "activities": self.activities,
            "misc": self.misc,
        }
