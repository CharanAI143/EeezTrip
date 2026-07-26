import logging
from typing import Callable, Dict, List, Set, Type, Any
import inspect
import asyncio

from backend.app.events.base import DomainEvent
from backend.app.core.feature_flags import feature_flags

logger = logging.getLogger("EventBus")

EventHandlerCallable = Callable[[DomainEvent], Any]

class EventBus:
    """In-process asynchronous/synchronous Event Bus with failure isolation and idempotency."""

    def __init__(self):
        self._subscribers: Dict[str, List[EventHandlerCallable]] = {}
        self._processed_event_ids: Set[str] = set()

    def subscribe(self, event_type: str, handler: EventHandlerCallable) -> None:
        """Register subscriber handler for event_type."""
        if event_type not in self._subscribers:
            self._subscribers[event_type] = []
        if handler not in self._subscribers[event_type]:
            self._subscribers[event_type].append(handler)

    def publish(self, event: DomainEvent) -> None:
        """Publish domain event to all registered subscribers with failure isolation."""
        if not feature_flags.EVENT_BUS:
            return

        # Idempotency check
        if event.event_id in self._processed_event_ids:
            return
        self._processed_event_ids.add(event.event_id)

        handlers = self._subscribers.get(event.event_name, [])
        handlers_all = self._subscribers.get("*", [])
        combined = handlers + handlers_all

        for handler in combined:
            try:
                if inspect.iscoroutinefunction(handler):
                    try:
                        loop = asyncio.get_running_loop()
                        loop.create_task(handler(event))
                    except RuntimeError:
                        asyncio.run(handler(event))
                else:
                    handler(event)
            except Exception as exc:
                # Failure Isolation: Handler exceptions are safely logged without crashing main execution
                logger.error(f"[EventBus] Handler {handler.__name__} failed processing event {event.event_name}: {exc}")

# Global In-Process Singleton Event Bus
event_bus = EventBus()
