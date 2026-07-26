from typing import List, Dict, Any
from backend.app.events.base import DomainEvent
from backend.app.core.feature_flags import feature_flags

class AnalyticsService:
    """Product Analytics Service recording user engagement metrics."""

    def __init__(self):
        self._analytics_events: List[Dict[str, Any]] = []

    def track_event(self, event: DomainEvent) -> None:
        if not feature_flags.ANALYTICS:
            return

        metric_entry = {
            "event_name": event.event_name,
            "timestamp": event.timestamp,
            "metadata": event.metadata
        }
        self._analytics_events.append(metric_entry)

    def get_metrics_summary(self) -> Dict[str, int]:
        summary: Dict[str, int] = {}
        for entry in self._analytics_events:
            name = entry["event_name"]
            summary[name] = summary.get(name, 0) + 1
        return summary

# Singleton AnalyticsService Instance
analytics_service = AnalyticsService()
