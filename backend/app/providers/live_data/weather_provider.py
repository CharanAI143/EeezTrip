import requests
from typing import Dict, Any
from backend.app.providers.live_data.base import BaseLiveDataProvider

class LiveWeatherProvider(BaseLiveDataProvider):
    """Live environmental weather data provider."""

    @property
    def category(self) -> str:
        return "weather"

    def fetch_data(self, key: str) -> Dict[str, Any]:
        dest = key.strip()
        try:
            geo_url = f"https://geocoding-api.open-meteo.com/v1/search?name={dest}&count=1"
            geo_res = requests.get(geo_url, timeout=4).json()
            if not geo_res.get("results"):
                return self._fallback_weather(dest)

            lat = geo_res["results"][0]["latitude"]
            lon = geo_res["results"][0]["longitude"]

            weather_url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weathercode&timezone=auto"
            w_res = requests.get(weather_url, timeout=4).json()
            daily = w_res.get("daily", {})

            precip = daily.get("precipitation_sum", [0])[0] if daily.get("precipitation_sum") else 0
            code = daily.get("weathercode", [0])[0] if daily.get("weathercode") else 0

            return {
                "destination": dest,
                "temp_max": daily.get("temperature_2m_max", [28.5])[0],
                "temp_min": daily.get("temperature_2m_min", [21.0])[0],
                "precipitation_mm": precip,
                "is_rainy": precip > 2.0 or code in [51, 53, 55, 61, 63, 65, 80, 81, 82],
                "condition": "Rainy" if (precip > 2.0 or code in [51, 61, 80]) else "Clear/Sunny"
            }
        except Exception:
            return self._fallback_weather(dest)

    def _fallback_weather(self, destination: str) -> Dict[str, Any]:
        return {
            "destination": destination,
            "temp_max": 29.0,
            "temp_min": 22.0,
            "precipitation_mm": 0.0,
            "is_rainy": False,
            "condition": "Pleasant"
        }
