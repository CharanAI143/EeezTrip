from typing import Dict, Any, List
from backend.app.providers.live_data.base import BaseLiveDataProvider

class LiveEventsProvider(BaseLiveDataProvider):
    """Live cultural festivals and event discovery provider."""

    @property
    def category(self) -> str:
        return "events"

    def fetch_data(self, key: str) -> Dict[str, Any]:
        dest = key.strip()
        events = [
            {
                "event_id": f"evt_{dest.lower()}_1",
                "title": f"{dest} International Cultural Fair",
                "type": "Festival",
                "location": f"Central Square, {dest}",
                "description": "Live music, local artisanal food stalls, and evening fireworks display."
            }
        ]
        return {
            "destination": dest,
            "events": events
        }
