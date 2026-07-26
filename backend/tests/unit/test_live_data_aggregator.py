import pytest
from backend.app.providers.live_data.aggregator import LiveDataAggregator

def test_live_data_aggregator_fetches_and_caches():
    aggregator = LiveDataAggregator()

    # First fetch (uncached)
    data1 = aggregator.get_live_data("weather", "Goa")
    assert data1["is_cached"] is False
    assert "temp_max" in data1

    # Second fetch (served from cache)
    data2 = aggregator.get_live_data("weather", "Goa")
    assert data2["is_cached"] is True
    assert data2["temp_max"] == data1["temp_max"]

def test_live_data_aggregator_currency():
    aggregator = LiveDataAggregator()
    curr = aggregator.get_live_data("currency", "USD")

    assert curr["base_currency"] == "USD"
    assert "exchange_rates" in curr
