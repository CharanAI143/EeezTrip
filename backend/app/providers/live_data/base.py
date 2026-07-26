from abc import ABC, abstractmethod
from typing import Any, Dict

class BaseLiveDataProvider(ABC):
    """Abstract interface for all live travel data providers."""

    @property
    @abstractmethod
    def category(self) -> str:
        """Provider category (weather, places, events, currency)."""
        pass

    @abstractmethod
    def fetch_data(self, key: str) -> Dict[str, Any]:
        """Fetch raw normalized travel data for key (e.g. destination name or currency code)."""
        pass
