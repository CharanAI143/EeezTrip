import pytest
import time
from backend.app.providers.live_data.cache import LiveDataCache

def test_live_data_cache_hit_and_ttl():
    cache = LiveDataCache(ttls={"weather": 1})  # 1 second TTL for fast test
    cache.set("weather", "Goa", {"temp": 28})

    assert cache.get("weather", "Goa") == {"temp": 28}
    assert cache.is_fresh("weather", "Goa") is True

    # Sleep to expire TTL
    time.sleep(1.1)
    assert cache.get("weather", "Goa") is None
    assert cache.is_fresh("weather", "Goa") is False
