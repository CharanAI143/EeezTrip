from typing import List, Dict, Any
from backend.app.schemas.booking import BookingOffer, SavingsOpportunity

class SavingsDetector:
    """Detects price drops, cheaper alternatives, and budget savings opportunities."""

    def detect_savings(
        self,
        current_budget_breakdown: Dict[str, float],
        candidate_offers: List[BookingOffer]
    ) -> List[SavingsOpportunity]:
        opportunities: List[SavingsOpportunity] = []

        # Baseline cost allocations
        hotel_budget = current_budget_breakdown.get("accommodation", 10000.0)
        transport_budget = current_budget_breakdown.get("transport", 3000.0)

        for offer in candidate_offers:
            if offer.category == "hotel" and offer.price < hotel_budget:
                savings = hotel_budget - offer.price
                pct = round((savings / hotel_budget) * 100, 1)
                opportunities.append(SavingsOpportunity(
                    category="hotel",
                    current_option="Baseline Hotel Allocation",
                    alternative_option=offer.title,
                    current_price=hotel_budget,
                    alternative_price=offer.price,
                    savings_amount=savings,
                    percentage_saved=pct,
                    reason=f"Switch to {offer.title} and save ₹{int(savings):,} INR ({pct}% cheaper)."
                ))

            elif offer.category == "transport" and offer.price < transport_budget:
                savings = transport_budget - offer.price
                pct = round((savings / transport_budget) * 100, 1)
                opportunities.append(SavingsOpportunity(
                    category="transport",
                    current_option="Taxi/Private Transport",
                    alternative_option=offer.title,
                    current_price=transport_budget,
                    alternative_price=offer.price,
                    savings_amount=savings,
                    percentage_saved=pct,
                    reason=f"Use {offer.title} instead of private taxi to save ₹{int(savings):,} INR."
                ))

        return opportunities
