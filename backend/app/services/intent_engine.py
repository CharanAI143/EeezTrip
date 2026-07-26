from typing import Dict, Any, Optional
from backend.app.schemas.concierge import ConciergeRequest, ConciergeResponse, IntentType
from backend.app.services.intent_classifier import IntentClassifier
from backend.app.services.concierge_response_builder import ConciergeResponseBuilder
from backend.app.services.travel_intelligence_service import TravelIntelligenceService
from backend.app.services.trip_session_service import TripSessionService
from backend.app.providers.ai.factory import AIProviderFactory

class IntentEngine:
    """Intelligent Routing Engine directing concierge queries to domain services or LLM reasoning."""

    def __init__(
        self,
        classifier: Optional[IntentClassifier] = None,
        intelligence_service: Optional[TravelIntelligenceService] = None,
        session_service: Optional[TripSessionService] = None,
    ):
        self.classifier = classifier or IntentClassifier()
        self.intelligence_service = intelligence_service or TravelIntelligenceService()
        self.session_service = session_service or TripSessionService()

    async def process_query(
        self,
        req: ConciergeRequest,
        session_data: Optional[Dict[str, Any]] = None
    ) -> ConciergeResponse:
        intent, confidence = self.classifier.classify_intent(req.query)
        dest = "Goa"
        mood = "Relaxed"

        if session_data:
            pref = session_data.get("preferences", {})
            curr = session_data.get("current_itinerary", {})
            dest = pref.get("destination") or curr.get("destination") or dest
            mood = pref.get("mood") or mood

        # Publish Domain Event
        from backend.app.events.bus import event_bus
        from backend.app.events.domain_events import ConciergeInteraction
        event_bus.publish(ConciergeInteraction(
            user_id=req.user_id,
            query=req.query,
            detected_intent=intent.value,
            aggregate_id=dest
        ))

        # Routing based on Intent Type
        if intent == IntentType.WEATHER_QUESTION:
            intel = self.intelligence_service.get_intelligence(dest)
            return ConciergeResponseBuilder.build_weather_response(req.query, dest, intel.weather_summary)

        elif intent == IntentType.PACKING_ADVICE:
            intel = self.intelligence_service.get_intelligence(dest)
            return ConciergeResponseBuilder.build_packing_response(req.query, dest, intel.weather_summary, mood)

        elif intent == IntentType.TRIP_QUESTION and session_data:
            return ConciergeResponseBuilder.build_trip_question_response(req.query, session_data)

        # Fallback to LLM reasoning with full Trip Session context for open-ended queries
        return self._llm_reasoning_response(req.query, dest, intent, confidence, session_data)

    def _llm_reasoning_response(
        self,
        query: str,
        destination: str,
        intent: IntentType,
        confidence: float,
        session_data: Optional[Dict[str, Any]] = None
    ) -> ConciergeResponse:
        try:
            provider = AIProviderFactory.get_provider("gemini")
            prompt = f"Travel Concierge query for {destination}: '{query}'"
            if session_data:
                context_str = self.session_service.get_context(session_data)
                prompt = f"{context_str}\n\nTraveler Question: '{query}'\nConcierge Response:"

            if provider.is_available():
                reply = provider.generate_text(prompt)
                if reply:
                    return ConciergeResponse(
                        reply=reply,
                        detected_intent=intent,
                        confidence=confidence,
                        action_taken="LLM Contextual Reasoning",
                        metadata={"destination": destination}
                    )
        except Exception as exc:
            print(f"[IntentEngine] LLM reasoning fallback note: {exc}")

        # Deterministic fallback response
        return ConciergeResponse(
            reply=f"For your journey in {destination}, here is a helpful tip: {query.strip().capitalize()}. Enjoy your travel experience!",
            detected_intent=intent,
            confidence=confidence,
            action_taken="Deterministic Travel Assistant Response",
            metadata={"destination": destination}
        )
