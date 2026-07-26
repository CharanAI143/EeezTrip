from abc import ABC, abstractmethod
from typing import Dict, Any, List

class BaseWeatherProvider(ABC):
    """Abstract interface for environmental weather data providers."""

    @abstractmethod
    def fetch_forecast(self, destination: str) -> Dict[str, Any]:
        """Fetch temperature, condition, and precipitation forecast for destination."""
        pass

class BasePlacesProvider(ABC):
    """Abstract interface for local attraction and venue metadata providers."""

    @abstractmethod
    def fetch_place_insights(self, destination: str) -> List[Dict[str, Any]]:
        """Fetch venue opening hours, local festival, and crowds metadata."""
        pass
