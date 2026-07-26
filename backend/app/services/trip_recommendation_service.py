from typing import Tuple
from backend.app.schemas.trip import TripRequest, TripResponse
from backend.app.services.ai_orchestrator import AIOrchestrator
from backend.app.repositories.trip_repository import TripRepository

class TripRecommendationService:
    """Business logic service for trip recommendation requests."""

    def __init__(self, orchestrator: AIOrchestrator = None, repository: TripRepository = None):
        self.orchestrator = orchestrator or AIOrchestrator()
        self.repository = repository or TripRepository()

    async def generate_recommendation(self, req: TripRequest) -> Tuple[TripResponse, str]:
        """Validate request, orchestrate AI generation, persist to DB, and return (TripResponse, trip_id)."""
        # Business Rule Validations
        self._validate_business_rules(req)

        # AI Orchestration
        recommendation: TripResponse = self.orchestrator.generate_trip_recommendation(req)

        # Validate Cost Breakdown Alignment
        self._align_cost_breakdown(recommendation, req.budget)

        # Persistence to MongoDB via Repository
        trip_doc = {
            "user_id": "anonymous",
            "destination": recommendation.destination or req.destination,
            "title": recommendation.title,
            "preferences": req.model_dump(),
            "trip": recommendation.model_dump(),
        }
        saved_id = await self.repository.create_trip(trip_doc)

        # Publish Domain Event
        from backend.app.events.bus import event_bus
        from backend.app.events.domain_events import TripCreated
        event_bus.publish(TripCreated(
            user_id="anonymous",
            destination=recommendation.destination or req.destination,
            trip_id=saved_id,
            aggregate_id=saved_id
        ))

        return recommendation, saved_id

    def _validate_business_rules(self, req: TripRequest) -> None:
        if req.budget <= 0:
            raise ValueError("Budget must be a positive integer greater than zero.")
        if req.days < 1 or req.days > 14:
            raise ValueError("Trip duration must be between 1 and 14 days.")

    def _align_cost_breakdown(self, recommendation: TripResponse, target_budget: int) -> None:
        cb = recommendation.estimated_cost_breakdown
        current_sum = cb.accommodation + cb.food + cb.transport + cb.activities + cb.misc
        if current_sum != target_budget and target_budget > 0:
            # Rebalance misc to ensure exact budget sum rule
            diff = target_budget - (cb.accommodation + cb.food + cb.transport + cb.activities)
            cb.misc = max(0, diff)
