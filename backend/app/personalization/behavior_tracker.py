from typing import Dict, Any
from backend.app.events.bus import event_bus
from backend.app.events.base import DomainEvent

class BehaviorTracker:
    """Consumes domain events and tracks behavioral counts."""

    def __init__(self):
        self.signal_counts: Dict[str, int] = {
            "food_accepted": 0,
            "museum_rejected": 0,
            "transit_selected": 0,
            "boutique_hotel_viewed": 0,
            "daily_brief_opened": 0,
        }

    def record_signal(self, signal_key: str, count: int = 1) -> None:
        if signal_key in self.signal_counts:
            self.signal_counts[signal_key] += count
        else:
            self.signal_counts[signal_key] = count

    def get_signal_counts(self) -> Dict[str, int]:
        return dict(self.signal_counts)
