from typing import List, Dict, Any
from backend.app.events.base import DomainEvent
from backend.app.core.feature_flags import feature_flags

class AuditService:
    """Audit Trail Service recording platform events for debugging and compliance."""

    def __init__(self):
        self._audit_logs: List[Dict[str, Any]] = []

    def record_event(self, event: DomainEvent) -> None:
        if not feature_flags.AUDIT_TRAIL:
            return

        log_entry = {
            "event_id": event.event_id,
            "event_name": event.event_name,
            "aggregate_id": event.aggregate_id,
            "timestamp": event.timestamp,
            "payload": event.model_dump()
        }
        self._audit_logs.append(log_entry)

    def get_audit_trail(self, limit: int = 50) -> List[Dict[str, Any]]:
        return self._audit_logs[-limit:]

# Singleton AuditService Instance
audit_service = AuditService()
