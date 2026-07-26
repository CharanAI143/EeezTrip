from typing import Dict, Any, List
from backend.app.schemas.daily_brief import TripHealthScore, BriefRecommendation, RecommendationSeverity

class TripHealthCalculator:
    """Deterministic score calculator evaluating trip health (0 - 100)."""

    def calculate_score(
        self,
        weather_data: Dict[str, Any],
        recommendations: List[BriefRecommendation]
    ) -> TripHealthScore:
        score = 100
        factors = []

        # Weather Suitability (Max -25 pts if critical rain/heat)
        if weather_data.get("is_rainy"):
            deduction = 18
            score -= deduction
            factors.append({
                "category": "Weather Suitability",
                "impact": -deduction,
                "detail": "Rain expected during scheduled outdoor activities."
            })
        elif weather_data.get("temp_max", 25) > 34:
            deduction = 10
            score -= deduction
            factors.append({
                "category": "Weather Suitability",
                "impact": -deduction,
                "detail": "Extreme afternoon heat index."
            })
        else:
            factors.append({
                "category": "Weather Suitability",
                "impact": 0,
                "detail": "Optimal weather conditions."
            })

        # Recommendation Severities Impact
        for rec in recommendations:
            if rec.severity == RecommendationSeverity.CRITICAL:
                deduction = 15
                score -= deduction
                factors.append({
                    "category": rec.title,
                    "impact": -deduction,
                    "detail": rec.description
                })
            elif rec.severity == RecommendationSeverity.IMPORTANT:
                deduction = 8
                score -= deduction
                factors.append({
                    "category": rec.title,
                    "impact": -deduction,
                    "detail": rec.description
                })

        final_score = max(0, min(100, score))
        delta = 100 - final_score

        return TripHealthScore(
            score=final_score,
            contributing_factors=factors,
            improvement_delta=delta
        )
