from typing import List, Dict, Any, Optional

from backend.app.booking.aggregator import BookingAggregator
from backend.app.booking.ranker import OfferRanker
from backend.app.booking.savings import SavingsDetector
from backend.app.schemas.booking import (
    BookingOffer, SavingsOpportunity, BookingRecommendation
)
from backend.app.events.bus import event_bus
from backend.app.events.domain_events import (
    BetterHotelFound, PriceDropDetected, CheaperTransportFound,
    ActivityDiscountFound, FlightDealFound
)

class BookingIntelligenceService:
    """Flagship Booking Decision-Support Platform."""

    def __init__(
        self,
        aggregator: Optional[BookingAggregator] = None,
        ranker: Optional[OfferRanker] = None,
        savings_detector: Optional[SavingsDetector] = None,
    ):
        self.aggregator = aggregator or BookingAggregator()
        self.ranker = ranker or OfferRanker()
        self.savings_detector = savings_detector or SavingsDetector()

    def get_booking_intelligence(
        self,
        destination: str,
        current_budget_breakdown: Optional[Dict[str, float]] = None
    ) -> List[BookingRecommendation]:
        """Aggregate, rank, evaluate savings, publish domain events, and return high-value recommendations."""
        dest = destination.strip() or "Goa"
        budget = current_budget_breakdown or {"accommodation": 10000.0, "transport": 3000.0}

        # 1. Aggregate normalized offers
        raw_offers = self.aggregator.aggregate_offers(dest)

        # 2. Rank offers
        ranked_offers = self.rank_offers(raw_offers)

        # 3. Detect Savings Opportunities
        savings_opps = self.savings_detector.detect_savings(budget, ranked_offers)

        # 4. Build Structured Recommendations
        recommendations: List[BookingRecommendation] = []
        for opp in savings_opps:
            top_offer = next((o for o in ranked_offers if o.category == opp.category), ranked_offers[0])
            rec = BookingRecommendation(
                category=opp.category,
                title=f"💰 Save ₹{int(opp.savings_amount):,} INR on {opp.category.capitalize()}",
                description=opp.reason,
                savings_amount=opp.savings_amount,
                offer=top_offer,
                severity="IMPORTANT"
            )
            recommendations.append(rec)
            self._publish_booking_events(dest, opp, top_offer)

        return recommendations

    def rank_offers(self, offers: List[BookingOffer]) -> List[BookingOffer]:
        return self.rank_ranker_offers(offers)

    def rank_ranker_offers(self, offers: List[BookingOffer]) -> List[BookingOffer]:
        return self.ranker.rank_offers(offers)

    def _publish_booking_events(self, destination: str, opp: SavingsOpportunity, offer: BookingOffer) -> None:
        try:
            event_bus.publish(PriceDropDetected(
                destination=destination,
                category=opp.category,
                savings_amount=opp.savings_amount,
                aggregate_id=destination
            ))

            if opp.category == "hotel":
                event_bus.publish(BetterHotelFound(
                    destination=destination,
                    hotel_title=offer.title,
                    savings_amount=opp.savings_amount,
                    aggregate_id=destination
                ))
            elif opp.category == "transport":
                event_bus.publish(CheaperTransportFound(
                    destination=destination,
                    transport_mode=offer.title,
                    savings_amount=opp.savings_amount,
                    aggregate_id=destination
                ))
            elif opp.category == "flight":
                event_bus.publish(FlightDealFound(
                    destination=destination,
                    flight_title=offer.title,
                    savings_amount=opp.savings_amount,
                    aggregate_id=destination
                ))
            elif opp.category == "activity":
                event_bus.publish(ActivityDiscountFound(
                    destination=destination,
                    activity_title=offer.title,
                    savings_amount=opp.savings_amount,
                    aggregate_id=destination
                ))
        except Exception as exc:
            print(f"[BookingIntelligenceService] Event publishing note: {exc}")
