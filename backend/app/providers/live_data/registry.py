from typing import Dict, Optional
from backend.app.providers.live_data.base import BaseLiveDataProvider

class ProviderRegistry:
    """Registry governing live travel data providers with dependency injection."""

    def __init__(self):
        self._providers: Dict[str, BaseLiveDataProvider] = {}

    def register(self, provider: BaseLiveDataProvider) -> None:
        """Register a provider instance for its category."""
        self._providers[provider.category] = provider

    def get_provider(self, category: str) -> Optional[BaseLiveDataProvider]:
        """Retrieve registered provider for category."""
        return self._providers.get(category)
