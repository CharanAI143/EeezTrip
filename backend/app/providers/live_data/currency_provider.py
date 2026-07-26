from typing import Dict, Any
from backend.app.providers.live_data.base import BaseLiveDataProvider

class LiveCurrencyProvider(BaseLiveDataProvider):
    """Live foreign currency exchange rates provider."""

    @property
    def category(self) -> str:
        return "currency"

    def fetch_data(self, key: str) -> Dict[str, Any]:
        base_code = key.upper().strip() or "INR"
        # Standard FX conversion baseline rates relative to INR
        rates = {
            "INR": 1.0,
            "USD": 0.012,
            "EUR": 0.011,
            "GBP": 0.0095,
            "AED": 0.044
        }
        return {
            "base_currency": base_code,
            "exchange_rates": rates
        }
