import asyncio
from typing import Any, Dict, Optional

from backend.app.providers.ai.factory import AIProviderFactory, BaseLLMProvider
from backend.app.schemas.concierge import ConciergeRequest, ConciergeResponse, IntentType
from backend.app.services.intent_classifier import IntentClassifier
from backend.app.services.concierge_response_builder import ConciergeResponseBuilder
from backend.app.services.travel_intelligence_service import TravelIntelligenceService
from backend.app.services.trip_session_service import TripSessionService

_SYSTEM_INSTRUCTION = (
    "You are EeezTrip's AI travel concierge. Answer concisely, practically and warmly. "
    "Ground answers in the trip context provided."
)


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
        self.provider_names = AIProviderFactory.provider_chain()

    async def process_query(
        self,
        req: ConciergeRequest,
        session_data: Optional[Dict[str, Any]] = None
    ) -> ConciergeResponse:
        intent, confidence = self.classifier.classify_intent(req.query)
        dest = "Goa"
        mood = "Relaxed"

        if session_data:
            pref = session_data.get("preferences", {}) or {}
            curr = session_data.get("current_itinerary", {}) or {}
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
            intel = await asyncio.to_thread(self.intelligence_service.get_intelligence, dest)
            return ConciergeResponseBuilder.build_weather_response(req.query, dest, intel.weather_summary)

        if intent == IntentType.PACKING_ADVICE:
            intel = await asyncio.to_thread(self.intelligence_service.get_intelligence, dest)
            return ConciergeResponseBuilder.build_packing_response(req.query, dest, intel.weather_summary, mood)

        if intent == IntentType.TRIP_QUESTION and session_data:
            return ConciergeResponseBuilder.build_trip_question_response(req.query, session_data)

        # Fallback to LLM reasoning with full Trip Session context for open-ended queries
        return await self._llm_reasoning_response(req.query, dest, intent, confidence, session_data)

    async def _llm_reasoning_response(
        self,
        query: str,
        destination: str,
        intent: IntentType,
        confidence: float,
        session_data: Optional[Dict[str, Any]] = None
    ) -> ConciergeResponse:
        if session_data:
            context_str = await asyncio.to_thread(self.session_service.get_context, session_data)
            prompt = (
                f"{context_str}\n\n"
                f"Traveler Question: '{query}'\n"
                f"Answer as a concise, practical travel concierge. Destination: {destination}.\n"
                f"Concierge Response:"
            )
        else:
            prompt = (
                f"You are a travel concierge. Answer this question concisely and practically. "
                f"Destination: {destination}.\n"
                f"Traveler Question: '{query}'\n"
                f"Concierge Response:"
            )

        for provider_name in self.provider_names:
            try:
                provider = AIProviderFactory.get_provider(provider_name)
                if not provider.is_available():
                    continue
                # Provider calls are blocking HTTP, so keep them off the event loop.
                # The reply is shown to the traveller verbatim, so JSON mode must be
                # off: OpenAI-compatible endpoints reject response_format when the
                # messages never mention JSON.
                reply = await asyncio.to_thread(
                    provider.generate_text, prompt, _SYSTEM_INSTRUCTION, False
                )
                if reply and reply.strip():
                    return ConciergeResponse(
                        reply=reply.strip(),
                        detected_intent=intent,
                        confidence=confidence,
                        action_taken="LLM Contextual Reasoning",
                        metadata={"destination": destination, "provider": provider_name}
                    )
            except Exception as exc:
                print(f"[IntentEngine] Provider '{provider_name}' reasoning failed: {exc}")

        return ConciergeResponse(
            reply=(
                f"I couldn't reach my AI assistant just now, so here's a quick pointer for "
                f"{destination}: {query.strip().capitalize()}. Try again in a moment for a fuller answer."
            ),
            detected_intent=intent,
            confidence=confidence,
            action_taken="Deterministic Travel Assistant Response",
            metadata={"destination": destination}
        )
