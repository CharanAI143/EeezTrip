import requests
from typing import Dict, Any
from backend.app.providers.intelligence.base import BaseWeatherProvider

class OpenMeteoWeatherProvider(BaseWeatherProvider):
    """Real-time Open-Meteo weather provider implementation."""

    def fetch_forecast(self, destination: str) -> Dict[str, Any]:
        try:
            # Geocoding request
            geo_url = f"https://geocoding-api.open-meteo.com/v1/search?name={destination}&count=1"
            geo_res = requests.get(geo_url, timeout=5).json()
            if not geo_res.get("results"):
                return self._fallback_weather(destination)

            lat = geo_res["results"][0]["latitude"]
            lon = geo_res["results"][0]["longitude"]

            weather_url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weathercode&timezone=auto"
            w_res = requests.get(weather_url, timeout=5).json()
            daily = w_res.get("daily", {})

            precip = daily.get("precipitation_sum", [0])[0] if daily.get("precipitation_sum") else 0
            code = daily.get("weathercode", [0])[0] if daily.get("weathercode") else 0

            return {
                "destination": destination,
                "temp_max": daily.get("temperature_2m_max", [28])[0],
                "temp_min": daily.get("temperature_2m_min", [20])[0],
                "precipitation_mm": precip,
                "is_rainy": precip > 2.0 or code in [51, 53, 55, 61, 63, 65, 80, 81, 82],
                "condition": "Rainy" if (precip > 2.0 or code in [51, 61, 80]) else "Clear/Sunny"
            }
        except Exception:
            return self._fallback_weather(destination)

    def _fallback_weather(self, destination: str) -> Dict[str, Any]:
        return {
            "destination": destination,
            "temp_max": 29.5,
            "temp_min": 22.0,
            "precipitation_mm": 0.0,
            "is_rainy": False,
            "condition": "Pleasant"
        }
