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

        # Normalise day count so the plan always matches the requested duration.
        self._align_day_count(recommendation, req.days)

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
        """Ensure the cost breakdown sums exactly to the requested budget."""
        if target_budget <= 0:
            return

        cb = recommendation.estimated_cost_breakdown
        fields = ("accommodation", "food", "transport", "activities")
        for field in fields:
            setattr(cb, field, max(0, int(getattr(cb, field))))
        cb.misc = max(0, int(cb.misc))

        # Absorb any drift into misc; if the fixed categories already exceed the budget,
        # scale them down proportionally rather than silently under-reporting the total.
        subtotal = sum(getattr(cb, field) for field in fields)
        if subtotal > target_budget:
            scale = target_budget / subtotal
            for field in fields:
                setattr(cb, field, int(getattr(cb, field) * scale))
            subtotal = sum(getattr(cb, field) for field in fields)

        cb.misc = max(0, target_budget - subtotal)

    def _align_day_count(self, recommendation: TripResponse, target_days: int) -> None:
        """Ensure the daily plan has exactly the requested number of sequential day blocks."""
        target = max(1, min(target_days, 14))
        plan = list(recommendation.daily_plan)
        if not plan:
            return

        if len(plan) > target:
            plan = plan[:target]
        elif len(plan) < target:
            last = plan[-1]
            for index in range(len(plan) + 1, target + 1):
                plan.append(last.model_copy(update={
                    "day": index,
                    "title": f"{last.title} (continued)",
                }))

        for index, entry in enumerate(plan, start=1):
            entry.day = index
        recommendation.daily_plan = plan
