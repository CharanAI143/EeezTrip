import pytest
from backend.app.events.base import DomainEvent
from backend.app.events.bus import EventBus
from backend.app.events.domain_events import TripCreated, WeatherChanged

def test_event_bus_publishing_and_subscription():
    bus = EventBus()
    received_events = []

    def handler(event: DomainEvent):
        received_events.append(event)

    bus.subscribe("TripCreated", handler)

    evt = TripCreated(user_id="user_1", destination="Goa", trip_id="trip_100")
    bus.publish(evt)

    assert len(received_events) == 1
    assert received_events[0].event_name == "TripCreated"

def test_event_bus_failure_isolation():
    bus = EventBus()
    successful_runs = []

    def broken_handler(event: DomainEvent):
        raise RuntimeError("Simulated event handler failure!")

    def healthy_handler(event: DomainEvent):
        successful_runs.append(event)

    bus.subscribe("WeatherChanged", broken_handler)
    bus.subscribe("WeatherChanged", healthy_handler)

    evt = WeatherChanged(destination="Goa", condition="Rainy")
    # Publish should NOT crash despite broken_handler raising an exception
    bus.publish(evt)

    assert len(successful_runs) == 1

def test_event_bus_idempotent_processing():
    bus = EventBus()
    count = [0]

    def handler(event: DomainEvent):
        count[0] += 1

    bus.subscribe("TripCreated", handler)
    evt = TripCreated(event_id="static_evt_id_123", user_id="u1", destination="Goa", trip_id="t1")

    bus.publish(evt)
    bus.publish(evt)  # Second publish with same event_id

    assert count[0] == 1  # Should process only once
