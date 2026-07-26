from typing import Dict, Any, Optional
from backend.app.events.base import DomainEvent

class TripCreated(DomainEvent):
    event_name: str = "TripCreated"
    user_id: str = "anonymous"
    destination: str
    trip_id: str

class TripUpdated(DomainEvent):
    event_name: str = "TripUpdated"
    user_id: str = "anonymous"
    destination: str
    session_id: str
    instruction: str

class TripOptimized(DomainEvent):
    event_name: str = "TripOptimized"
    user_id: str = "anonymous"
    destination: str
    reason: str

class DailyBriefGenerated(DomainEvent):
    event_name: str = "DailyBriefGenerated"
    user_id: str = "anonymous"
    destination: str
    trip_health_score: int

class NotificationSent(DomainEvent):
    event_name: str = "NotificationSent"
    user_id: str = "anonymous"
    notification_type: str
    title: str

class TripStarted(DomainEvent):
    event_name: str = "TripStarted"
    user_id: str = "anonymous"
    destination: str

class TripCompleted(DomainEvent):
    event_name: str = "TripCompleted"
    user_id: str = "anonymous"
    destination: str

class WeatherChanged(DomainEvent):
    event_name: str = "WeatherChanged"
    destination: str
    condition: str

class AttractionClosed(DomainEvent):
    event_name: str = "AttractionClosed"
    destination: str
    attraction_name: str

class ConciergeInteraction(DomainEvent):
    event_name: str = "ConciergeInteraction"
    user_id: str = "anonymous"
    query: str
    detected_intent: str

class TrafficUpdated(DomainEvent):
    event_name: str = "TrafficUpdated"
    destination: str
    traffic_level: str = "normal"

class EventDiscovered(DomainEvent):
    event_name: str = "EventDiscovered"
    destination: str
    event_title: str

class PriceChanged(DomainEvent):
    event_name: str = "PriceChanged"
    destination: str
    item_type: str

class ExchangeRateUpdated(DomainEvent):
    event_name: str = "ExchangeRateUpdated"
    user_id: str = "anonymous"
    notification_type: str = "currency_update"
    title: str

class BetterHotelFound(DomainEvent):
    event_name: str = "BetterHotelFound"
    destination: str
    hotel_title: str
    savings_amount: float

class PriceDropDetected(DomainEvent):
    event_name: str = "PriceDropDetected"
    destination: str
    category: str
    savings_amount: float

class CheaperTransportFound(DomainEvent):
    event_name: str = "CheaperTransportFound"
    destination: str
    transport_mode: str
    savings_amount: float

class ActivityDiscountFound(DomainEvent):
    event_name: str = "ActivityDiscountFound"
    destination: str
    activity_title: str
    savings_amount: float

class FlightDealFound(DomainEvent):
    event_name: str = "FlightDealFound"
    destination: str
    flight_title: str
    savings_amount: float

class RecommendationAccepted(DomainEvent):
    event_name: str = "RecommendationAccepted"
    user_id: str = "anonymous"
    recommendation_id: str
    category: str

class RecommendationRejected(DomainEvent):
    event_name: str = "RecommendationRejected"
    user_id: str = "anonymous"
    recommendation_id: str
    category: str

class BookingViewed(DomainEvent):
    event_name: str = "BookingViewed"
    user_id: str = "anonymous"
    offer_id: str
    category: str

class BookingConfirmed(DomainEvent):
    event_name: str = "BookingConfirmed"
    user_id: str = "anonymous"
    offer_id: str
    category: str

class FavoriteAdded(DomainEvent):
    event_name: str = "FavoriteAdded"
    user_id: str = "anonymous"
    item_title: str
    category: str

class FavoriteRemoved(DomainEvent):
    event_name: str = "FavoriteRemoved"
    user_id: str = "anonymous"
    item_title: str
    category: str

class PreferenceUpdated(DomainEvent):
    event_name: str = "PreferenceUpdated"
    user_id: str = "anonymous"
    key: str
    value: Any

class LearningCompleted(DomainEvent):
    event_name: str = "LearningCompleted"
    user_id: str = "anonymous"
    updates_count: int

class ProfileChanged(DomainEvent):
    event_name: str = "ProfileChanged"
    user_id: str = "anonymous"
