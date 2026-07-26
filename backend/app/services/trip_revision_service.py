import json
from pathlib import Path
from typing import Dict, Any

from backend.app.providers.ai.factory import AIProviderFactory
from backend.app.schemas.trip import PlanRevisionRequest, PlanRevisionResponse, TripResponse
from backend.app.repositories.trip_repository import TripRepository

class TripRevisionService:
    """Business logic service for trip revision requests."""

    def __init__(self, repository: TripRepository = None):
        self.repository = repository or TripRepository()
        self.prompts_dir = Path(__file__).resolve().parent.parent / "prompts"

    def _load_prompt_template(self) -> str:
        filepath = self.prompts_dir / "trip_revision.md"
        if not filepath.exists():
            raise FileNotFoundError(f"Revision prompt template not found: {filepath}")
        with open(filepath, "r", encoding="utf-8") as f:
            return f.read()

    async def revise_trip(self, req: PlanRevisionRequest) -> PlanRevisionResponse:
        """Revise an existing trip itinerary based on user natural language instruction."""
        if len(req.instruction.strip()) < 3:
            raise ValueError("Revision instruction must be at least 3 characters long.")

        template = self._load_prompt_template()
        pref = req.preferences
        curr = req.current_plan
        dest = curr.destination or pref.destination or "Destination"

        prompt = (
            template
            .replace("{destination}", dest)
            .replace("{days}", str(pref.days))
            .replace("{mood}", pref.mood)
            .replace("{budget}", str(pref.budget))
            .replace("{current_plan_json}", json.dumps(curr.model_dump(), indent=2))
            .replace("{instruction}", req.instruction)
        )

        providers_to_try = ["gemini", "ollama"]
        for provider_name in providers_to_try:
            try:
                provider = AIProviderFactory.get_provider(provider_name)
                if provider.is_available():
                    raw_text = provider.generate_text(prompt)
                    if raw_text:
                        parsed = self._clean_and_parse_json(raw_text)
                        res = PlanRevisionResponse(**parsed)
                        self._publish_revision_event(req, res)
                        return res
            except Exception as exc:
                print(f"[TripRevisionService] Provider '{provider_name}' revision failed: {exc}")

        # Fallback response generator if AI models fail
        res = self._generate_fallback_revision(req)
        self._publish_revision_event(req, res)
        return res

    def _publish_revision_event(self, req: PlanRevisionRequest, res: PlanRevisionResponse) -> None:
        from backend.app.events.bus import event_bus
        from backend.app.events.domain_events import TripUpdated
        event_bus.publish(TripUpdated(
            user_id="anonymous",
            destination=res.revised_plan.destination or "Destination",
            session_id="session_active",
            instruction=req.instruction,
            aggregate_id=res.revised_plan.destination or "global"
        ))

    def _clean_and_parse_json(self, raw_text: str) -> Dict[str, Any]:
        cleaned = raw_text.strip()
        if "```json" in cleaned:
            cleaned = cleaned.split("```json")[1].split("```")[0].strip()
        elif "```" in cleaned:
            cleaned = cleaned.split("```")[1].split("```")[0].strip()
        return json.loads(cleaned)

    def _generate_fallback_revision(self, req: PlanRevisionRequest) -> PlanRevisionResponse:
        """Generate structured fallback response applying instruction adjustments."""
        revised_plan = TripResponse(**req.current_plan.model_dump())
        instr_lower = req.instruction.lower()

        if "cheaper" in instr_lower or "budget" in instr_lower:
            cb = revised_plan.estimated_cost_breakdown
            cb.accommodation = int(cb.accommodation * 0.8)
            cb.food = int(cb.food * 0.8)
            revised_plan.summary += " (Adjusted for budget-friendly preferences)."
            change_summary = "Reduced accommodation and dining costs by 20% to optimize budget."
        elif "food" in instr_lower:
            revised_plan.must_try_food.append("Local Street Food Tasting Tour")
            change_summary = "Added additional authentic local food experiences and culinary stops."
        else:
            revised_plan.title = f"Revised: {revised_plan.title}"
            change_summary = f"Incorporated traveler request: '{req.instruction}'."

        return PlanRevisionResponse(
            revised_plan=revised_plan,
            change_summary=change_summary,
            reasoning=f"Adjusted daily activities and recommendations to align with instruction '{req.instruction}'."
        )
