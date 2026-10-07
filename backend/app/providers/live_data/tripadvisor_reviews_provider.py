"""Tripadvisor review aggregation for destinations, served alongside Google's.

Tripadvisor is the source that actually answers for *city-level* destinations:
SerpApi's ``google_maps_reviews`` engine reports "No reviews" for places like
Goa or Jaipur (states and cities have no Google Maps review page in that
engine's eyes), while Tripadvisor's destination pages carry full traveller
write-ups for exactly those queries. The two sources are complementary, so
this provider deliberately mirrors :mod:`reviews_provider` rather than
replacing it.

Two SerpApi calls per destination: a Tripadvisor *search* to resolve the
destination to a Tripadvisor ``place_id`` (one credit), then the Tripadvisor
*reviews* engine for that id (one credit). Both are cached; a destination that
cannot be resolved degrades to an empty list rather than an error, because this
is a signed-out visitor's enrichment and must never fail the reviews page.
"""

import threading
import time
from typing import Any, Dict, List, Optional

from backend.app.core.config import settings
from backend.app.providers.live_data.base import BaseLiveDataProvider
from backend.app.utils.http_client import fetch_with_retry

SERPAPI_ENDPOINT = "https://serpapi.com/search.json"

MAX_TRIPADVISOR_REVIEWS = 6

REVIEWS_CACHE_TTL_SEC = 60 * 60 * 12
# A destination that could not be resolved (bad name, transient outage) is
# retried much sooner than a destination that legitimately has no reviews —
# caching a failure for half a day is how a single bad minute turns into
# "no reviews" all afternoon.
NEGATIVE_CACHE_TTL_SEC = 60 * 10

_cache_lock = threading.Lock()
_cache: Dict[str, Dict[str, Any]] = {}

# "Tripadvisor has no reviews here" and "SerpApi did not answer" both arrive
# as an empty list; the flag keeps them apart so an outage is never shown to a
# visitor as an invitation to write the first review of a well-reviewed city.
_failed_lock = threading.Lock()
_failed: Dict[str, bool] = {}


def _cache_key(destination: str) -> str:
    return " ".join(destination.lower().split())


def _mark_failed(destination: str, failed: bool) -> None:
    with _failed_lock:
        _failed[_cache_key(destination)] = failed


def last_fetch_failed(destination: str) -> bool:
    """True when the most recent lookup for this destination errored."""
    with _failed_lock:
        return _failed.get(_cache_key(destination), False)


def _cached(destination: str) -> Optional[List[Dict[str, Any]]]:
    with _cache_lock:
        entry = _cache.get(_cache_key(destination))
    if not entry:
        return None
    ttl = REVIEWS_CACHE_TTL_SEC if entry["value"] else NEGATIVE_CACHE_TTL_SEC
    if time.time() - entry["timestamp"] > ttl:
        return None
    return entry["value"]


def _store(destination: str, value: List[Dict[str, Any]]) -> None:
    with _cache_lock:
        _cache[_cache_key(destination)] = {"value": value, "timestamp": time.time()}


# Destination-page links are stored apart from the review cache so a negative
# review cache does not throw away a link we already resolved.
_links: Dict[str, str] = {}
_links_lock = threading.Lock()


def _set_link(destination: str, url: str) -> None:
    with _links_lock:
        _links[_cache_key(destination)] = url


def reset_tripadvisor_cache() -> None:
    """Forget every cached Tripadvisor review and link. For tests."""
    with _cache_lock:
        _cache.clear()
    with _links_lock:
        _links.clear()
    with _failed_lock:
        _failed.clear()


def _coerce_rating(value: Any) -> Optional[float]:
    try:
        rating = float(value)
    except (TypeError, ValueError):
        return None
    return rating if 1.0 <= rating <= 5.0 else None


def _coerce_int(value: Any) -> Optional[int]:
    try:
        number = int(value)
    except (TypeError, ValueError):
        return None
    return number if number > 0 else None


def _pick_place(payload: Dict[str, Any], destination: str) -> Optional[Dict[str, Any]]:
    """Choose the Tripadvisor entry the visitor actually meant.

    A search for "Goa" returns the destination itself first, then a pile of
    hotels and restaurants *in* Goa. Preferring GEO entries and ranking the rest
    by title overlap keeps the reviews about the place, not about the first
    hotel Tripadvisor happens to rank.
    """
    results = payload.get("places") or []
    if not isinstance(results, list):
        return None

    wanted = _cache_key(destination)
    candidates = [p for p in results if isinstance(p, dict) and p.get("place_id")]
    if not candidates:
        return None

    def score(place: Dict[str, Any]) -> tuple:
        title = _cache_key(str(place.get("title") or ""))
        geo = place.get("place_type") == "GEO"
        exact = title == wanted
        contains = wanted in title or title in wanted
        position = place.get("position") or 999
        return (geo, exact, contains, -position)

    return max(candidates, key=score)


def _normalise_review(raw: Any, place: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    if not isinstance(raw, dict):
        return None

    text = raw.get("snippet") or raw.get("text") or raw.get("title")
    if not isinstance(text, str) or not text.strip():
        return None

    author_raw = raw.get("author")
    if isinstance(author_raw, dict):
        author = author_raw.get("name") or author_raw.get("username")
    else:
        author = author_raw or raw.get("user_name")
    # Tripadvisor sometimes omits the name ("a traveller"); the review is still
    # worth showing as long as the words are there, so fall back to a generic
    # attribution instead of dropping it.
    if not isinstance(author, str) or not author.strip():
        author = "Tripadvisor traveller"

    visited = raw.get("date") or raw.get("travel_date") or raw.get("visit_date")
    return {
        "author": author.strip()[:100],
        "rating": _coerce_rating(raw.get("rating")),
        "text": text.strip()[:2000],
        "visitedAt": visited.strip()[:60] if isinstance(visited, str) and visited.strip() else None,
        "totalReviews": _coerce_int(place.get("reviews")),
        "averageRating": _coerce_rating(place.get("rating")),
        "placeName": str(place.get("title") or "").strip()[:200],
        "source": "tripadvisor",
        "url": str(raw.get("link") or "") or None,
    }


class TripadvisorReviewsProvider(BaseLiveDataProvider):
    """Reads a destination's Tripadvisor reviews through SerpApi."""

    @property
    def category(self) -> str:
        return "reviews"

    def fetch_data(self, key: str) -> Dict[str, Any]:
        return {"destination": key.strip(), "reviews": self.reviews_for(key)}

    def reviews_for(self, destination: str) -> List[Dict[str, Any]]:
        """Tripadvisor reviews for a destination, or ``[]``. Never raises."""
        destination = destination.strip()
        if not destination or len(destination) > 200:
            return []

        cached = _cached(destination)
        if cached is not None:
            return cached

        api_key = (settings.SERPAPI_API_KEY or "").strip()
        if not api_key:
            _mark_failed(destination, True)
            return []

        search_payload = fetch_with_retry(
            SERPAPI_ENDPOINT,
            params={
                "engine": "tripadvisor",
                "q": destination,
                "api_key": api_key,
            },
        )
        if not isinstance(search_payload, dict) or search_payload.get("error"):
            # No answer (timeout, tripped circuit) or an in-band SerpApi error:
            # an outage, not a place without reviews. Flagged rather than
            # cached, so the next request tries again.
            _mark_failed(destination, True)
            return []

        place = _pick_place(search_payload, destination)
        if not place:
            # The search answered and resolved nothing — Tripadvisor genuinely
            # has no page for this string. A real, cacheable empty.
            _mark_failed(destination, False)
            _store(destination, [])
            return []

        reviews_payload = fetch_with_retry(
            SERPAPI_ENDPOINT,
            params={
                "engine": "tripadvisor_reviews",
                "place_id": str(place.get("place_id")),
                "api_key": api_key,
            },
        )

        # The place resolved, so an empty list here means the *reviews* call
        # failed — the destination page exists and is reviewed.
        reviews_ok = isinstance(reviews_payload, dict) and not reviews_payload.get("error")
        _mark_failed(destination, not reviews_ok)

        reviews: List[Dict[str, Any]] = []
        if reviews_ok:
            raw_reviews = reviews_payload.get("reviews")
            if isinstance(raw_reviews, list):
                # The reviews payload carries its own totals for the place;
                # prefer them over the search stub when present.
                place_meta = {
                    **place,
                    "rating": reviews_payload.get("rating") or place.get("rating"),
                    "reviews": reviews_payload.get("reviews_count") or place.get("reviews"),
                }
                for raw in raw_reviews[:MAX_TRIPADVISOR_REVIEWS]:
                    normalised = _normalise_review(raw, place_meta)
                    if normalised:
                        reviews.append(normalised)

        # The Tripadvisor link for the destination page, carried on the place
        # search result, so the frontend can offer a "more reviews" escape
        # hatch even when the review body call failed.
        if place.get("link"):
            _set_link(destination, str(place["link"]))

        _store(destination, reviews)
        return reviews

    def link_for(self, destination: str) -> Optional[str]:
        """Destination page URL on Tripadvisor, when it has been seen."""
        with _links_lock:
            return _links.get(_cache_key(destination))
