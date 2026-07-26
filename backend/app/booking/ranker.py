from typing import List
from backend.app.schemas.booking import BookingOffer

class OfferRanker:
    """Configurable multi-factor offer ranking engine."""

    def __init__(
        self,
        weight_price: float = 0.40,
        weight_rating: float = 0.30,
        weight_distance: float = 0.20,
        weight_flexibility: float = 0.10,
    ):
        self.weight_price = weight_price
        self.weight_rating = weight_rating
        self.weight_distance = weight_distance
        self.weight_flexibility = weight_flexibility

    def rank_offers(self, offers: List[BookingOffer]) -> List[BookingOffer]:
        """Rank list of offers in descending score order."""
        if not offers:
            return []

        def compute_score(offer: BookingOffer) -> float:
            # Price Component (Normalized baseline 10,000 INR)
            price_score = max(0.0, 1.0 - (offer.price / 15000.0))
            # Rating Component (Normalized 0-5)
            rating_score = offer.rating / 5.0
            # Distance Component (Normalized 0-10km)
            distance_score = max(0.0, 1.0 - (offer.distance_from_itinerary_km / 10.0))
            # Flexibility Bonus
            flex_bonus = 1.0 if "Free Cancellation" in offer.cancellation_policy else 0.5

            total_score = (
                (price_score * self.weight_price) +
                (rating_score * self.weight_rating) +
                (distance_score * self.weight_distance) +
                (flex_bonus * self.weight_flexibility)
            )
            return total_score

        return sorted(offers, key=compute_score, reverse=True)
