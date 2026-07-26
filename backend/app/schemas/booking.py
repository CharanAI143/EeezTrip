from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

class BookingOffer(BaseModel):
    id: str
    provider: str
    category: str  # hotel, flight, transport, activity
    title: str
    price: float
    currency: str = "INR"
    rating: float = 4.5
    location: str
    distance_from_itinerary_km: float = 1.0
    travel_time_mins: int = 15
    cancellation_policy: str = "Free Cancellation"
    booking_url: str = "https://eeeztrip.com/partner-deal"
    metadata: Dict[str, Any] = Field(default_factory=dict)

class SavingsOpportunity(BaseModel):
    category: str
    current_option: str
    alternative_option: str
    current_price: float
    alternative_price: float
    savings_amount: float
    percentage_saved: float
    reason: str

class OfferComparison(BaseModel):
    category: str
    current_offer: BookingOffer
    alternative_offer: BookingOffer
    trade_offs: List[str] = Field(default_factory=list)
    verdict: str

class BookingRecommendation(BaseModel):
    category: str
    title: str
    description: str
    savings_amount: float = 0.0
    offer: BookingOffer
    severity: str = "IMPORTANT"  # INFO, SUGGESTION, IMPORTANT, CRITICAL
