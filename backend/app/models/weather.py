from typing import Dict, Any

class WeatherModel:
    """Placeholder persistence model for WeatherSnapshot entity."""
    def __init__(self, place: str, temp_max: float, temp_min: float, condition: str):
        self.place = place
        self.temperature_max = temp_max
        self.temperature_min = temp_min
        self.condition = condition

    def to_dict(self) -> Dict[str, Any]:
        return {
            "place": self.place,
            "temperature_max": self.temperature_max,
            "temperature_min": self.temperature_min,
            "condition": self.condition,
        }
