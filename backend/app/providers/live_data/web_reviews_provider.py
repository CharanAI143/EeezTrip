"""MakeMyTrip and Booking.com review snippets, harvested through web search.

Neither site publishes a reviews API, and both block direct scraping (MMT
times out, Booking answers a bot-challenge page). What *does* work on the
existing SerpApi key is a Google search restricted to the site: the organic
results come back with the review page's title and a snippet that is usually
verbatim review text. That is thinner than Tripadvisor's full reviews — a
sentence rather than a paragraph — but it is the site's own words, attributed
and linkable, and it is all a signed-out visitor can get without a paid
scraping contract.

One SerpApi credit per site per destination, cached alongside the other
sources. Missing snippets are skipped rather than padded: a search result
without a snippet is a listing, not a review.
"""

import threading
import time
from typing import Any, Dict, List, Optional

from backend.app.core.config import settings
from backend.app.providers.live_data.base import BaseLiveDataProvider
from backend.app.utils.http_client import fetch_with_retry

SERPAPI_ENDPOINT = "https://serpapi.com/search.json"

MAX_SNIPPETS_PER_SITE = 3

REVIEWS_CACHE_TTL_SEC = 60 * 60 * 12
NEGATIVE_CACHE_TTL_SEC = 60 * 10

# Which sites to try, and how each is addressed in the search query and
# labelled in the UI. Booking's site-restricted results are unreliable (Google
# routinely substitutes Tripadvisor), so it is best-effort: when the result
# host does not match, the snippet is dropped and only the outbound link is
# offered.
SITES = {
    "makemytrip": {
        # The site's name has to appear as an ordinary query word: Google
        # silently drops a bare `site:` operator from queries like
        # "goa reviews site:makemytrip.com" and answers with Tripadvisor
        # instead. "makemytrip goa reviews site:makemytrip.com" keeps it.
        "query_word": "makemytrip",
        "query_suffix": "site:makemytrip.com",
        "label": "MakeMyTrip",
        "host": "makemytrip.com",
        "link": "https://www.makemytrip.com/tourism/{slug}-tourism.html",
    },
    "booking": {
        "query_word": "booking.com",
        "query_suffix": "site:booking.com",
        "label": "Booking.com",
        "host": "booking.com",
        "link": "https://www.booking.com/searchresults.html?ss={query}",
    },
}

_cache_lock = threading.Lock()
_cache: Dict[str, Dict[str, Any]] = {}

# "The site has no reviews for this place" and "SerpApi did not answer" are
# different facts, but both arrive as an empty list. The flag keeps the
# difference alive for the endpoint, so an outage can never be shown to a
# visitor as an invitation to write the first review of a well-reviewed city.
_failed_lock = threading.Lock()
_failed: Dict[str, bool] = {}


def _cache_key(destination: str, site: str) -> str:
    return f"{site}:{' '.join(destination.lower().split())}"


def _mark_failed(destination: str, site: str, failed: bool) -> None:
    with _failed_lock:
        _failed[_cache_key(destination, site)] = failed


def last_fetch_failed(destination: str, site: str) -> bool:
    """True when the most recent lookup for this destination/site errored."""
    with _failed_lock:
        return _failed.get(_cache_key(destination, site), False)


def _cached(destination: str, site: str) -> Optional[List[Dict[str, Any]]]:
    with _cache_lock:
        entry = _cache.get(_cache_key(destination, site))
    if not entry:
        return None
    ttl = REVIEWS_CACHE_TTL_SEC if entry["value"] else NEGATIVE_CACHE_TTL_SEC
    if time.time() - entry["timestamp"] > ttl:
        return None
    return entry["value"]


def _store(destination: str, site: str, value: List[Dict[str, Any]]) -> None:
    with _cache_lock:
        _cache[_cache_key(destination, site)] = {"value": value, "timestamp": time.time()}


def reset_web_review_cache() -> None:
    """Forget every cached web review. For tests."""
    with _cache_lock:
        _cache.clear()
    with _failed_lock:
        _failed.clear()


def _host_matches(link: str, host: str) -> bool:
    netloc = link.split("/", 3)[2] if "://" in link else link.split("/", 1)[0]
    netloc = netloc.lower()
    return netloc == host or netloc.endswith("." + host)


def _normalise_result(raw: Any, destination: str, site: str) -> Optional[Dict[str, Any]]:
    if not isinstance(raw, dict):
        return None

    snippet = raw.get("snippet")
    if not isinstance(snippet, str) or not snippet.strip():
        return None

    link = str(raw.get("link") or "")
    if not link:
        return None
    # Google occasionally ignores the site: operator; a result from another
    # host is not this site's review no matter what the query asked for.
    if not _host_matches(link, SITES[site]["host"]):
        return None

    title = str(raw.get("title") or "").strip()
    return {
        # The snippet is a property review with no identifiable reviewer
        # attached; attributing it to the site is the honest option.
        "author": SITES[site]["label"],
        "rating": None,
        "text": snippet.strip()[:2000],
        "visitedAt": None,
        "totalReviews": None,
        "averageRating": None,
        "placeName": title[:200] if title else destination,
        "source": site,
        "url": link,
    }


class WebReviewProvider(BaseLiveDataProvider):
    """Reads MakeMyTrip / Booking.com review snippets through Google search."""

    @property
    def category(self) -> str:
        return "reviews"

    def fetch_data(self, key: str) -> Dict[str, Any]:
        return {"destination": key.strip(), "reviews": self.reviews_for(key)}

    def reviews_for(self, destination: str, site: str = "makemytrip") -> List[Dict[str, Any]]:
        """Review snippets for a destination from one travel site. Never raises."""
        destination = destination.strip()
        if site not in SITES:
            return []
        if not destination or len(destination) > 200:
            return []

        cached = _cached(destination, site)
        if cached is not None:
            return cached

        api_key = (settings.SERPAPI_API_KEY or "").strip()
        if not api_key:
            _mark_failed(destination, site, True)
            return []

        payload = fetch_with_retry(
            SERPAPI_ENDPOINT,
            params={
                "engine": "google",
                "q": (
                    f'{SITES[site]["query_word"]} {destination} reviews '
                    f'{SITES[site]["query_suffix"]}'
                ),
                "hl": "en",
                "gl": "in",
                "api_key": api_key,
            },
        )
        if not isinstance(payload, dict) or payload.get("error"):
            # No answer (timeout, tripped circuit) or an in-band SerpApi error:
            # an outage, not an empty place. Flagged rather than cached, so the
            # next request tries again.
            _mark_failed(destination, site, True)
            return []

        _mark_failed(destination, site, False)
        reviews: List[Dict[str, Any]] = []
        organic = payload.get("organic_results")
        if isinstance(organic, list):
            for raw in organic:
                normalised = _normalise_result(raw, destination, site)
                if normalised:
                    reviews.append(normalised)
                if len(reviews) >= MAX_SNIPPETS_PER_SITE:
                    break

        _store(destination, site, reviews)
        return reviews

    def link_for(self, destination: str, site: str) -> Optional[str]:
        """Outbound search/landing URL for the destination on this site."""
        if site not in SITES:
            return None
        config = SITES[site]
        slug = "-".join(destination.lower().split())
        if site == "booking":
            from urllib.parse import quote_plus

            return config["link"].format(query=quote_plus(destination))
        return config["link"].format(slug=slug)
