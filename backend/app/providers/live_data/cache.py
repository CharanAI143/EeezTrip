import time
from typing import Dict, Any, Optional

class LiveDataCache:
    """In-memory cache with category-specific TTLs for high performance and fallback resilience."""

    DEFAULT_TTLS = {
        "weather": 1800,   # 30 minutes
        "places": 3600,    # 60 minutes
        "events": 7200,    # 2 hours
        "currency": 14400, # 4 hours
    }

    def __init__(self, ttls: Optional[Dict[str, int]] = None):
        self.ttls = {**self.DEFAULT_TTLS, **(ttls or {})}
        self._cache: Dict[str, Dict[str, Any]] = {}

    def get(self, category: str, key: str) -> Optional[Any]:
        """Retrieve cached entry if present and fresh."""
        cache_key = f"{category}:{key.lower()}"
        entry = self._cache.get(cache_key)
        if not entry:
            return None

        ttl = self.ttls.get(category, 1800)
        age = time.time() - entry["timestamp"]
        if age > ttl:
            return None  # Stale data

        return entry["value"]

    def set(self, category: str, key: str, value: Any) -> None:
        """Store value in cache with current timestamp."""
        cache_key = f"{category}:{key.lower()}"
        self._cache[cache_key] = {
            "value": value,
            "timestamp": time.time()
        }

    def is_fresh(self, category: str, key: str) -> bool:
        return self.get(category, key) is not None
