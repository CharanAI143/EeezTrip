import os
import json
import random
from typing import Dict, Any, List
from pathlib import Path

from backend.app.providers.ai.factory import AIProviderFactory
from backend.app.schemas.trip import TripRequest, TripResponse, DayPlan, CostBreakdown

class AIOrchestrator:
    """Orchestrates AI provider selection, prompt loading, retries, and schema validation."""

    def __init__(self):
        self.prompts_dir = Path(__file__).resolve().parent.parent / "prompts"

    def _load_prompt_template(self, filename: str) -> str:
        filepath = self.prompts_dir / filename
        if not filepath.exists():
            raise FileNotFoundError(f"Prompt template file not found: {filepath}")
        with open(filepath, "r", encoding="utf-8") as f:
            return f.read()

    def generate_trip_recommendation(self, req: TripRequest) -> TripResponse:
        """Load prompt template, query AI provider, and return validated TripResponse DTO."""
        raw_template = self._load_prompt_template("trip_recommendation.md")
        destination = req.destination.strip() or self._fallback_destination(req.mood)
        
        prompt = (
            raw_template
            .replace("{origin}", req.origin or "Your origin location")
            .replace("{destination}", destination)
            .replace("{days}", str(max(1, min(req.days, 14))))
            .replace("{mood}", req.mood)
            .replace("{budget}", str(req.budget))
            .replace("{start_date}", req.start_date or "Flexible")
            .replace("{end_date}", req.end_date or "Flexible")
        )

        # Attempt primary provider (Gemini / Ollama), with fallback retry loop
        providers_to_try = ["gemini", "ollama"]
        last_exception = None

        for provider_name in providers_to_try:
            try:
                provider = AIProviderFactory.get_provider(provider_name)
                if provider.is_available():
                    # Attempt generation with selected provider
                    raw_text = provider.generate_text(prompt)
                    if raw_text:
                        parsed_json = self._clean_and_parse_json(raw_text)
                        return TripResponse(**parsed_json)
            except Exception as exc:
                last_exception = exc
                print(f"[AIOrchestrator] Provider '{provider_name}' failed: {exc}")

        # Deterministic structured fallback generator if AI models are unavailable
        return self._generate_fallback_response(req, destination)

    def _clean_and_parse_json(self, raw_text: str) -> Dict[str, Any]:
        """Strip markdown fences and parse clean JSON."""
        cleaned = raw_text.strip()
        if "```json" in cleaned:
            cleaned = cleaned.split("```json")[1].split("```")[0].strip()
        elif "```" in cleaned:
            cleaned = cleaned.split("```")[1].split("```")[0].strip()
        return json.loads(cleaned)

    def _fallback_destination(self, mood: str) -> str:
        mood_map = {
            "relaxed": "Bali",
            "romantic": "Paris",
            "adventure": "Queenstown",
            "nature": "Costa Rica",
            "foodie": "Tokyo"
        }
        return mood_map.get(mood.lower(), "Bali")

    def _generate_fallback_response(self, req: TripRequest, destination: str) -> TripResponse:
        """Construct a valid TripResponse schema deterministically when AI models fail."""
        days = max(1, min(req.days, 14))
        dest_lower = destination.lower().replace(" ", "_")
        daily_plans = []
        neighborhoods = ["North Beach District", "Central Old Town", "South Bay Marina", "Heritage Market Square"]
        for d in range(1, days + 1):
            district = neighborhoods[(d - 1) % len(neighborhoods)]
            daily_plans.append(DayPlan(
                day=d,
                title=f"Day {d}: Exploring {destination} ({district})",
                morning=f"Morning walk through {district} & breakfast at local artisan cafe in {destination}.",
                midday=f"Lunch at top-rated regional eatery near {district} landmark square.",
                afternoon=f"Guided tour of {district} heritage sights and scenic viewpoint (Place ID: plc_{dest_lower}_{d}).",
                evening=f"Dinner at seaside restaurant in {district} overlooking {destination}.",
                tip=f"All Day {d} sights are clustered within 1.5 km in {district} to eliminate unnecessary cross-city travel."
            ))

        acc = int(req.budget * 0.40)
        food = int(req.budget * 0.25)
        transport = int(req.budget * 0.15)
        activities = int(req.budget * 0.12)
        misc = req.budget - (acc + food + transport + activities)

        return TripResponse(
            destination=destination,
            title=f"{req.mood} {destination} Getaway",
            tagline=f"Experience the essence of {destination}.",
            summary=f"A curated {days}-day {req.mood.lower()} trip to {destination} tailored to a budget of ₹{req.budget:,} INR.",
            best_time="Spring and Autumn for mild weather and optimal sightseeing.",
            highlights=[f"Iconic views of {destination}", "Authentic local dining", "Cultural exploration"],
            daily_plan=daily_plans,
            cozy_tips=["Keep offline maps saved", "Pack comfortable walking shoes", "Stay hydrated"],
            must_try_food=[f"Traditional {destination} regional specialty", "Local artisan dessert"],
            estimated_cost_breakdown=CostBreakdown(
                accommodation=acc,
                food=food,
                transport=transport,
                activities=activities,
                misc=max(0, misc)
            )
        )
