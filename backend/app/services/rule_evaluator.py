from abc import ABC, abstractmethod
from typing import List, Dict, Any
from backend.app.schemas.daily_brief import BriefRecommendation, RecommendationSeverity

class RuleStrategy(ABC):
    """Abstract Strategy interface for deterministic travel rule evaluation."""

    @abstractmethod
    def evaluate(
        self,
        destination: str,
        itinerary: Dict[str, Any],
        weather_data: Dict[str, Any],
        places_data: List[Dict[str, Any]]
    ) -> List[BriefRecommendation]:
        pass

class WeatherRuleStrategy(RuleStrategy):
    """Evaluates rain, heat, and weather suitability for outdoor activities."""

    def evaluate(self, destination: str, itinerary: Dict[str, Any], weather_data: Dict[str, Any], places_data: List[Dict[str, Any]]) -> List[BriefRecommendation]:
        recs = []
        if weather_data.get("is_rainy"):
            recs.append(BriefRecommendation(
                title="Rain Forecasted During Outdoor Sightseeing",
                description=f"Heavy rain expected in {destination} today. Consider swapping outdoor walks with museum visits.",
                severity=RecommendationSeverity.CRITICAL,
                action_type="weather_opt"
            ))
        elif weather_data.get("temp_max", 25) > 34:
            recs.append(BriefRecommendation(
                title="Extreme Heat Advisory",
                description=f"Afternoon temperatures reaching {weather_data.get('temp_max')}°C. Shift outdoor tours to early morning.",
                severity=RecommendationSeverity.IMPORTANT,
                action_type="timing_opt"
            ))
        return recs

class TransitRuleStrategy(RuleStrategy):
    """Evaluates peak hour traffic and transit advisories."""

    def evaluate(self, destination: str, itinerary: Dict[str, Any], weather_data: Dict[str, Any], places_data: List[Dict[str, Any]]) -> List[BriefRecommendation]:
        recs = []
        for p in places_data:
            if p.get("category") == "transit":
                recs.append(BriefRecommendation(
                    title=p.get("title", "Heavy Transit Advisory"),
                    description=p.get("message", "Traffic expected."),
                    severity=RecommendationSeverity.IMPORTANT,
                    action_type="traffic_opt"
                ))
        return recs

class AttractionClosureStrategy(RuleStrategy):
    """Evaluates venue closure schedules."""

    def evaluate(self, destination: str, itinerary: Dict[str, Any], weather_data: Dict[str, Any], places_data: List[Dict[str, Any]]) -> List[BriefRecommendation]:
        recs = []
        for p in places_data:
            if p.get("category") == "schedule":
                recs.append(BriefRecommendation(
                    title=p.get("title", "Venue Closure Advisory"),
                    description=p.get("message", ""),
                    severity=RecommendationSeverity.IMPORTANT,
                    action_type="timing_opt"
                ))
        return recs

class BudgetOpportunityStrategy(RuleStrategy):
    """Evaluates budget savings opportunities."""

    def evaluate(self, destination: str, itinerary: Dict[str, Any], weather_data: Dict[str, Any], places_data: List[Dict[str, Any]]) -> List[BriefRecommendation]:
        recs = []
        cb = itinerary.get("estimated_cost_breakdown", {})
        if cb.get("misc", 0) > 5000:
            recs.append(BriefRecommendation(
                title="Budget Savings Opportunity",
                description="High miscellaneous expenditure allocated. Swap paid tours with scenic coastal walks.",
                severity=RecommendationSeverity.SUGGESTION,
                action_type="budget_opt"
            ))
        return recs

class RuleEvaluator:
    """Engine executing registered rule evaluation strategies."""

    def __init__(self, strategies: List[RuleStrategy] = None):
        self.strategies = strategies or [
            WeatherRuleStrategy(),
            TransitRuleStrategy(),
            AttractionClosureStrategy(),
            BudgetOpportunityStrategy()
        ]

    def evaluate_all(
        self,
        destination: str,
        itinerary: Dict[str, Any],
        weather_data: Dict[str, Any],
        places_data: List[Dict[str, Any]]
    ) -> List[BriefRecommendation]:
        all_recs = []
        for strategy in self.strategies:
            all_recs.extend(strategy.evaluate(destination, itinerary, weather_data, places_data))
        return all_recs
