from abc import ABC, abstractmethod
from typing import List, Dict, Any

class BaseBookingProvider(ABC):
    """Abstract Base Class for all booking supply providers."""

    @property
    @abstractmethod
    def category(self) -> str:
        """Category string: hotel, flight, transport, or activity."""
        pass

    @abstractmethod
    def fetch_offers(self, destination: str) -> List[Dict[str, Any]]:
        """Fetch raw offer payloads for destination."""
        pass
