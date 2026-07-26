from typing import Tuple
from backend.app.schemas.concierge import IntentType

class IntentClassifier:
    """Classifies user queries into discrete travel intent categories."""

    def classify_intent(self, query: str) -> Tuple[IntentType, float]:
        q_lower = query.lower().strip()

        # Weather Intent Keywords
        if any(w in q_lower for w in ["weather", "rain", "temperature", "temp", "forecast", "climate", "hot", "cold", "umbrella"]):
            return IntentType.WEATHER_QUESTION, 0.98

        # Revision Intent Keywords
        if any(w in q_lower for w in ["revise", "change", "cheaper", "budget", "extend", "shorten", "add day", "remove", "modify"]):
            return IntentType.REVISION_REQUEST, 0.95

        # Place / Dining Recommendation Keywords
        if any(w in q_lower for w in ["restaurant", "food", "eat", "café", "cafe", "place", "attraction", "visit", "must see", "spot"]):
            return IntentType.PLACE_RECOMMENDATION, 0.92

        # Packing Advice Keywords
        if any(w in q_lower for w in ["pack", "clothes", "wear", "jacket", "shoes", "luggage", "bring"]):
            return IntentType.PACKING_ADVICE, 0.96

        # Trip / Itinerary Question Keywords
        if any(w in q_lower for w in ["day 1", "day 2", "day 3", "itinerary", "schedule", "plan", "summary", "cost", "breakdown"]):
            return IntentType.TRIP_QUESTION, 0.90

        # General Fallback
        return IntentType.GENERAL_TRAVEL_ADVICE, 0.85
