from typing import Dict, Any, Optional
from datetime import datetime

from backend.app.schemas.daily_brief import (
    DailyBrief, DailyBriefSections, RecommendationSeverity, BriefRecommendation
)
from backend.app.services.rule_evaluator import RuleEvaluator
from backend.app.services.trip_health_calculator import TripHealthCalculator
from backend.app.services.travel_intelligence_service import TravelIntelligenceService
from backend.app.services.trip_session_service import TripSessionService

class DailyBriefService:
    """Flagship service generating daily travel briefings, score evaluations, and recommendations."""

    def __init__(
        self,
        rule_evaluator: Optional[RuleEvaluator] = None,
        health_calculator: Optional[TripHealthCalculator] = None,
        intelligence_service: Optional[TravelIntelligenceService] = None,
        session_service: Optional[TripSessionService] = None,
    ):
        self.rule_evaluator = rule_evaluator or RuleEvaluator()
        self.health_calculator = health_calculator or TripHealthCalculator()
        self.intelligence_service = intelligence_service or TravelIntelligenceService()
        self.session_service = session_service or TripSessionService()

    async def generate_daily_brief(self, destination: str, session_id: Optional[str] = None) -> DailyBrief:
        """Generate deterministic DailyBrief for destination or active session."""
        dest = destination.strip() or "Goa"
        itinerary = {}
        session_data = None

        if session_id:
            session_data = await self.session_service.get_session(session_id)
            if session_data and session_data.get("current_itinerary"):
                itinerary = session_data["current_itinerary"]
                dest = itinerary.get("destination", dest)

        # 1. Collect Facts & Intelligence
        intelligence = self.intelligence_service.get_intelligence(dest)
        weather_summary = intelligence.weather_summary
        places_data = [i.model_dump() for i in intelligence.insights]

        # 2. Evaluate Deterministic Rules
        all_recs = self.rule_evaluator.evaluate_all(dest, itinerary, weather_summary, places_data)

        # Filter only IMPORTANT and CRITICAL severities for Daily Brief
        brief_recs = [r for r in all_recs if r.severity in [RecommendationSeverity.IMPORTANT, RecommendationSeverity.CRITICAL]]

        # 3. Calculate Trip Health Score
        health_score = self.health_calculator.calculate_score(weather_summary, all_recs)

        # 4. Build Sections
        weather_bullets = [
            f"Condition: {weather_summary.get('condition', 'Clear')}",
            f"High: {weather_summary.get('temp_max', 28)}°C | Low: {weather_summary.get('temp_min', 20)}°C"
        ]
        if weather_summary.get("is_rainy"):
            weather_bullets.append("Rain expected today — keep an umbrella ready.")

        transport_bullets = ["Local transit operating normally."]
        events_bullets = []
        warnings_bullets = [r.description for r in brief_recs]
        opportunities_bullets = []

        # Query Booking Intelligence for high-value savings opportunities
        try:
            from backend.app.booking.service import BookingIntelligenceService
            booking_svc = BookingIntelligenceService()
            cb_breakdown = itinerary.get("estimated_cost_breakdown", {})
            booking_recs = booking_svc.get_booking_intelligence(dest, cb_breakdown)
            for b_rec in booking_recs:
                opportunities_bullets.append(f"{b_rec.title}: {b_rec.description}")
        except Exception as exc:
            print(f"[DailyBriefService] Booking Intelligence integration note: {exc}")

        for p in intelligence.insights:
            if p.category == "transit":
                transport_bullets.append(p.message)
            elif p.category == "festival":
                events_bullets.append(f"{p.title}: {p.message}")

        summary = f"Good Morning! Your trip health score for {dest} today is {health_score.score}/100. Weather is {weather_summary.get('condition', 'pleasant')}."
        if brief_recs:
            summary += f" We found {len(brief_recs)} advisory insights to optimize your experience."

        brief = DailyBrief(
            destination=dest,
            trip_health_score=health_score,
            summary=summary,
            sections=DailyBriefSections(
                weather=weather_bullets,
                transport=transport_bullets,
                events=events_bullets,
                warnings=warnings_bullets,
                opportunities=opportunities_bullets
            ),
            recommendations=brief_recs,
            can_optimize=len(brief_recs) > 0 or health_score.score < 90,
            generated_at=datetime.utcnow().isoformat() + "Z"
        )

        # Publish Domain Event
        from backend.app.events.bus import event_bus
        from backend.app.events.domain_events import DailyBriefGenerated
        event_bus.publish(DailyBriefGenerated(
            user_id="anonymous",
            destination=dest,
            trip_health_score=health_score.score,
            aggregate_id=dest
        ))

        return brief
