from typing import Dict, Any, Optional
from backend.app.schemas.concierge import ConciergeResponse, IntentType

class ConciergeResponseBuilder:
    """Builder for constructing context-aware Concierge responses."""

    @staticmethod
    def build_weather_response(
        query: str,
        destination: str,
        weather_data: Dict[str, Any]
    ) -> ConciergeResponse:
        cond = weather_data.get("condition", "Pleasant")
        t_max = weather_data.get("temp_max", 28)
        t_min = weather_data.get("temp_min", 20)
        is_rain = weather_data.get("is_rainy", False)

        msg = f"The forecast for {destination} is currently {cond} with highs around {t_max}°C and lows near {t_min}°C."
        if is_rain:
            msg += " Rain is expected, so keep an umbrella handy!"

        return ConciergeResponse(
            reply=msg,
            detected_intent=IntentType.WEATHER_QUESTION,
            confidence=0.98,
            action_taken="Queried Travel Intelligence Weather Provider",
            metadata={"destination": destination, "weather": weather_data}
        )

    @staticmethod
    def build_packing_response(
        query: str,
        destination: str,
        weather_data: Dict[str, Any],
        mood: str
    ) -> ConciergeResponse:
        t_max = weather_data.get("temp_max", 28)
        is_rain = weather_data.get("is_rainy", False)

        items = ["Comfortable walking shoes", "Sunscreen", "Reusable water bottle", "Light breathable clothing"]
        if is_rain:
            items.append("Rain jacket / compact umbrella")
        if t_max > 30:
            items.append("Sun hat & sunglasses")

        reply = f"For your {mood.lower()} trip to {destination}, we recommend packing:\n" + "\n".join(f"• {i}" for i in items)

        return ConciergeResponse(
            reply=reply,
            detected_intent=IntentType.PACKING_ADVICE,
            confidence=0.96,
            action_taken="Synthesized packing list from environmental weather & mood profile",
            metadata={"destination": destination, "recommended_items": items}
        )

    @staticmethod
    def build_trip_question_response(
        query: str,
        session_data: Dict[str, Any]
    ) -> ConciergeResponse:
        curr = session_data.get("current_itinerary", {})
        title = curr.get("title", "Your Trip")
        summary = curr.get("summary", "Custom Travel Plan")
        dest = curr.get("destination", "Destination")

        reply = f"Regarding **{title}** in **{dest}**:\n{summary}"

        return ConciergeResponse(
            reply=reply,
            detected_intent=IntentType.TRIP_QUESTION,
            confidence=0.92,
            action_taken="Extracted answer from Single Source of Truth Trip Session",
            metadata={"title": title, "destination": dest}
        )
