from backend.app.events.base import DomainEvent
from backend.app.events.bus import event_bus
from backend.app.services.audit_service import audit_service
from backend.app.services.analytics_service import analytics_service

def audit_event_handler(event: DomainEvent) -> None:
    """Universal audit log handler recording all platform events."""
    audit_service.record_event(event)

def analytics_event_handler(event: DomainEvent) -> None:
    """Product analytics handler tracking key engagement events."""
    analytics_service.track_event(event)

def notification_event_handler(event: DomainEvent) -> None:
    """Dispatches notifications or reaction logs upon domain events."""
    print(f"[NotificationEventHandler] Reacting to event: {event.event_name}")

def daily_brief_event_handler(event: DomainEvent) -> None:
    """Triggers briefing recalculations upon trip updates or optimizations."""
    print(f"[DailyBriefEventHandler] Re-evaluating briefing for aggregate: {event.aggregate_id}")

def register_all_event_handlers() -> None:
    """Register all subscriber handlers with the global EventBus."""
    # Universal wild-card subscribers
    event_bus.subscribe("*", audit_event_handler)
    event_bus.subscribe("*", analytics_event_handler)

    # Specific event subscribers
    event_bus.subscribe("TripCreated", notification_event_handler)
    event_bus.subscribe("TripUpdated", daily_brief_event_handler)
    event_bus.subscribe("TripOptimized", daily_brief_event_handler)
    event_bus.subscribe("DailyBriefGenerated", analytics_event_handler)
