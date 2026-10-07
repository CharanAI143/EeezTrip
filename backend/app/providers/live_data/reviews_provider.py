"""Google review aggregation for destinations, served to signed-out visitors.

There is no free, unauthenticated way to read Google's review corpus, so this
goes through SerpApi — the same key already used for flight and hotel pricing in
`backend.main`. SerpApi costs a credit per search, and an anonymous visitor hits
this endpoint on every page load, so every response is cached and a miss on an
unavailable key degrades to an empty list rather than an error.

The shape returned here is deliberately *not* the shape of a traveller review.
These are third-party reviews attributed to a place, with no user identity, and
the frontend keeps them in a separate component for exactly that reason.
"""

import threading
import time
from typing import Any, Dict, List, Optional

from backend.app.core.config import settings
from backend.app.providers.live_data.base import BaseLiveDataProvider
from backend.app.utils.http_client import fetch_with_retry

SERPAPI_ENDPOINT = "https://serpapi.com/search.json"

# SerpApi's google_maps engine returns at most a handful of reviews per place, so
# asking for more just costs credits.
MAX_REVIEWS_PER_PLACE = 8

# Reviews change slowly and nobody expects a review feed to be live to the
# minute. A long TTL is what makes the per-load cost of an anonymous page view
# close to zero.
REVIEWS_CACHE_TTL_SEC = 60 * 60 * 12

# An empty result is usually a transient miss — a SerpApi blip, an unknown
# spelling — not a place that will never have reviews. Holding a failure for
# twelve hours is how one bad minute becomes "no reviews" all afternoon, so
# empties are retried much sooner.
NEGATIVE_CACHE_TTL_SEC = 60 * 10

_cache_lock = threading.Lock()
_cache: Dict[str, Dict[str, Any]] = {}

# "Google has no reviews for this place" and "SerpApi did not answer" both
# arrive as an empty list; the flag keeps them apart so an outage is never
# shown to a visitor as an invitation to write the first review of a
# well-reviewed city.
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


def reset_review_cache() -> None:
    """Forget every cached review. For tests."""
    with _cache_lock:
        _cache.clear()
    with _failed_lock:
        _failed.clear()


def _coerce_rating(value: Any) -> Optional[float]:
    """Google reports ratings inconsistently: 4, "4", "4.5" and 4.0 all occur."""
    try:
        rating = float(value)
    except (TypeError, ValueError):
        return None
    # A rating outside 1-5 is not a rating. Clamping would invent a score the
    # reviewer never gave, so it is dropped instead.
    return rating if 1.0 <= rating <= 5.0 else None


def _normalise_review(raw: Any, place: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Map one SerpApi review onto our public shape, or drop it."""
    if not isinstance(raw, dict):
        return None

    text = raw.get("description") or raw.get("snippet") or raw.get("text")
    if not isinstance(text, str) or not text.strip():
        return None

    author = raw.get("author") or raw.get("profile_name") or raw.get("user_name")
    if not isinstance(author, str) or not author.strip():
        # Without an author there is nothing to attribute the words to, and an
        # unattributed quote reads as if the app wrote it.
        return None

    visited = raw.get("review_date") or raw.get("date") or raw.get("when")
    return {
        "author": author.strip()[:100],
        "rating": _coerce_rating(raw.get("rating")),
        "text": text.strip()[:2000],
        "visitedAt": visited.strip()[:60] if isinstance(visited, str) and visited.strip() else None,
        "totalReviews": _positive_int(place.get("reviews")),
        "averageRating": _coerce_rating(place.get("rating")),
        "placeName": str(place.get("title") or "").strip()[:200],
        "source": "google",
        "url": None,
    }


def _positive_int(value: Any) -> Optional[int]:
    try:
        number = int(value)
    except (TypeError, ValueError):
        return None
    return number if number > 0 else None


def _pick_place(payload: Dict[str, Any], destination: str) -> Optional[Dict[str, Any]]:
    """Choose which of Google's results actually represents the destination.

    A search for "Paris" returns the city, plus airports, hostels and a Paris
    in Texas. Ranking by how closely the title matches what was asked for keeps
    the reviews about the place the visitor meant.
    """
    results = payload.get("local_results") or payload.get("place_results")
    if isinstance(results, dict):
        return results if results.get("title") else None
    if not isinstance(results, list):
        return None

    wanted = _cache_key(destination)
    candidates = [r for r in results if isinstance(r, dict) and (r.get("reviews") or r.get("data_id") or r.get("place_id"))]
    if not candidates:
        return None

    def score(place: Dict[str, Any]) -> tuple:
        title = _cache_key(str(place.get("title") or ""))
        exact = title == wanted
        starts = title.startswith(wanted) or wanted.startswith(title)
        contains = wanted in title or title in wanted
        has_reviews = bool(place.get("reviews")) or bool(place.get("data_id")) or bool(place.get("place_id"))
        return (exact, starts, contains, has_reviews, _positive_int(place.get("reviews")) or 0)

    return max(candidates, key=score)


class GoogleReviewsProvider(BaseLiveDataProvider):
    """Reads a destination's Google reviews through SerpApi."""

    @property
    def category(self) -> str:
        return "reviews"

    def fetch_data(self, key: str) -> Dict[str, Any]:
        return {"destination": key.strip(), "reviews": self.reviews_for(key)}

    def reviews_for(self, destination: str) -> List[Dict[str, Any]]:
        """Reviews for a destination, or an empty list if they cannot be had.

        Never raises. A third-party review feed is an enhancement for signed-out
        visitors, and it must not be able to fail the reviews page.
        """
        destination = destination.strip()
        if not destination or len(destination) > 200:
            return []

        cached = _cached(destination)
        if cached is not None:
            return cached

        api_key = (settings.SERPAPI_API_KEY or "").strip()
        if not api_key:
            print("[Reviews] SERPAPI_API_KEY is not set; skipping Google reviews.")
            _mark_failed(destination, True)
            return []

        payload = fetch_with_retry(
            SERPAPI_ENDPOINT,
            params={
                "engine": "google_maps",
                "type": "search",
                "q": destination,
                "hl": "en",
                "gl": "in",
                "api_key": api_key,
            },
        )
        if not isinstance(payload, dict):
            print(f"[Reviews] SerpApi returned no usable payload for {destination!r}.")
            _mark_failed(destination, True)
            return []

        payload_failed = bool(payload.get("error"))
        if payload_failed:
            # SerpApi reports its own failures in-band with HTTP 200, so this is
            # the only way to see an exhausted quota or a bad key.
            print(f"[Reviews] SerpApi error for {destination!r}: {payload['error']}")

        place = _pick_place(payload, destination)
        reviews: List[Dict[str, Any]] = []
        reviews_fetch_failed = False
        if place:
            # Fetch actual review text from google_maps_reviews if IDs exist
            data_id = place.get("data_id")
            place_id = place.get("place_id")
            reviews_payload = None
            if data_id or place_id:
                params: Dict[str, Any] = {
                    "engine": "google_maps_reviews",
                    "hl": "en",
                    "gl": "in",
                    "api_key": api_key,
                }
                if data_id:
                    params["data_id"] = data_id
                if place_id and not data_id:
                    params["place_id"] = place_id
                try:
                    reviews_payload = fetch_with_retry(SERPAPI_ENDPOINT, params=params)
                except Exception:
                    reviews_payload = None
                reviews_fetch_failed = not (
                    isinstance(reviews_payload, dict) and not reviews_payload.get("error")
                )

            raw_reviews: Any = None
            if isinstance(reviews_payload, dict):
                raw_reviews = reviews_payload.get("reviews") or place.get("reviews")
                # prefer place metadata from reviews payload if present
                place_meta = reviews_payload.get("place_info") or {}
                if place_meta and isinstance(place_meta, dict):
                    place = {**place, **place_meta}
            else:
                raw_reviews = place.get("reviews")

            if isinstance(raw_reviews, list):
                for raw in raw_reviews[:MAX_REVIEWS_PER_PLACE]:
                    normalised = _normalise_review(raw, place)
                    if normalised:
                        reviews.append(normalised)

        # An outage is not an empty place: flag it for the endpoint and skip
        # the cache, so the next visitor's request tries again instead of
        # being told nobody has reviewed this destination.
        failed = payload_failed or (reviews_fetch_failed and not reviews)
        _mark_failed(destination, failed)
        if failed and not reviews:
            return []

        _store(destination, reviews)
        return reviews
