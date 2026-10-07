"""Unit tests for the third-party review sources behind ``/api/reviews/external``.

SerpApi costs a credit per call and answers differently from day to day, so
every test here stubs ``fetch_with_retry`` and pins what the providers *send*
(the queries) and what they make of what comes back (host filtering, place
choice, normalisation). Those are the two places a silent regression hides:
the page would just look empty again.
"""

import pytest

from backend.app.core.config import settings
from backend.app.providers.live_data import reviews_provider as google_mod
from backend.app.providers.live_data import tripadvisor_reviews_provider as ta_mod
from backend.app.providers.live_data import web_reviews_provider as web_mod


@pytest.fixture(autouse=True)
def _clean_caches():
    """Providers keep process-wide caches; tests must not see each other's."""
    for reset in (
        google_mod.reset_review_cache,
        ta_mod.reset_tripadvisor_cache,
        web_mod.reset_web_review_cache,
    ):
        reset()
    yield
    for reset in (
        google_mod.reset_review_cache,
        ta_mod.reset_tripadvisor_cache,
        web_mod.reset_web_review_cache,
    ):
        reset()


@pytest.fixture
def serpapi_key(monkeypatch):
    monkeypatch.setattr(settings, "SERPAPI_API_KEY", "test-key")
    return "test-key"


def _fake_fetch(calls, payload):
    """A ``fetch_with_retry`` that records params and hands back ``payload``."""

    def fetch(url, params=None, **kwargs):
        calls.append(params or {})
        return payload

    return fetch


# ── MakeMyTrip / Booking.com snippets ─────────────────────────────────────────

def test_query_keeps_the_site_name_beside_the_site_operator(monkeypatch, serpapi_key):
    # Google silently drops a bare `site:` operator ("goa reviews
    # site:makemytrip.com" answers with Tripadvisor), so the site's own name
    # must appear as an ordinary query word too.
    calls = []
    monkeypatch.setattr(web_mod, "fetch_with_retry", _fake_fetch(calls, {"organic_results": []}))

    provider = web_mod.WebReviewProvider()
    provider.reviews_for("goa", "makemytrip")
    provider.reviews_for("goa", "booking")

    assert calls[0]["q"] == "makemytrip goa reviews site:makemytrip.com"
    assert calls[1]["q"] == "booking.com goa reviews site:booking.com"


def test_foreign_hosts_and_snippetless_results_are_dropped(monkeypatch, serpapi_key):
    payload = {
        "organic_results": [
            {
                "link": "https://www.makemytrip.com/hotels/beach-view-details-goa.html",
                "snippet": "  Great stay, clean rooms.  ",
                "title": "Beach View Goa",
            },
            # A listing without a snippet is not a review.
            {"link": "https://www.makemytrip.com/hotels/no-snippet.html", "snippet": "  ", "title": "No snippet"},
            # Google occasionally ignores site: — another host's words are
            # never this site's review.
            {"link": "https://www.tripadvisor.in/ShowTopic-goa.html", "snippet": "Forum chatter", "title": "Forum"},
            "not-a-dict",
        ]
    }
    monkeypatch.setattr(web_mod, "fetch_with_retry", _fake_fetch([], payload))

    reviews = web_mod.WebReviewProvider().reviews_for("goa", "makemytrip")

    assert len(reviews) == 1
    review = reviews[0]
    assert review["source"] == "makemytrip"
    assert review["author"] == "MakeMyTrip"
    assert review["text"] == "Great stay, clean rooms."
    assert review["url"] == "https://www.makemytrip.com/hotels/beach-view-details-goa.html"


def test_repeated_lookups_are_served_from_cache(monkeypatch, serpapi_key):
    calls = []
    monkeypatch.setattr(web_mod, "fetch_with_retry", _fake_fetch(calls, {"organic_results": []}))

    provider = web_mod.WebReviewProvider()
    provider.reviews_for("goa", "makemytrip")
    provider.reviews_for("goa", "makemytrip")
    provider.reviews_for("jaipur", "makemytrip")

    assert len(calls) == 2  # goa once, jaipur once


def test_an_empty_answer_is_retried_after_the_negative_ttl(monkeypatch, serpapi_key):
    # An empty result must not freeze "no reviews" for half a day — a SerpApi
    # hiccup at breakfast would otherwise own the afternoon.
    calls = []
    monkeypatch.setattr(web_mod, "fetch_with_retry", _fake_fetch(calls, {"organic_results": []}))
    provider = web_mod.WebReviewProvider()

    provider.reviews_for("goa", "booking")
    key = web_mod._cache_key("goa", "booking")
    with web_mod._cache_lock:
        web_mod._cache[key]["timestamp"] -= web_mod.NEGATIVE_CACHE_TTL_SEC + 1
    provider.reviews_for("goa", "booking")

    assert len(calls) == 2


def test_booking_link_carries_the_destination_query():
    url = web_mod.WebReviewProvider().link_for("New Delhi", "booking")
    assert url == "https://www.booking.com/searchresults.html?ss=New+Delhi"


def test_a_failed_fetch_is_reported_as_failure_not_as_an_empty_place(monkeypatch, serpapi_key):
    # fetch_with_retry returns None on a timeout or a tripped circuit. Showing
    # that as "no reviews yet, be the first" would send a visitor to write the
    # first review of a well-reviewed city.
    monkeypatch.setattr(web_mod, "fetch_with_retry", lambda *args, **kwargs: None)
    provider = web_mod.WebReviewProvider()

    assert provider.reviews_for("goa", "makemytrip") == []
    assert web_mod.last_fetch_failed("goa", "makemytrip") is True

    # An answer with no usable results, on the other hand, is a real empty.
    monkeypatch.setattr(web_mod, "fetch_with_retry", _fake_fetch([], {"organic_results": []}))
    web_mod.reset_web_review_cache()
    assert provider.reviews_for("goa", "makemytrip") == []
    assert web_mod.last_fetch_failed("goa", "makemytrip") is False


def test_a_serpapi_error_counts_as_a_failure_too(monkeypatch, serpapi_key):
    monkeypatch.setattr(
        web_mod,
        "fetch_with_retry",
        _fake_fetch([], {"error": "Your account ran out of searches."}),
    )
    web_mod.WebReviewProvider().reviews_for("goa", "booking")

    assert web_mod.last_fetch_failed("goa", "booking") is True


# ── Tripadvisor ───────────────────────────────────────────────────────────────

def _search_payload():
    # Tripadvisor ranks a hotel *in* the destination above the destination
    # itself for some queries; the GEO entry is the one with traveller
    # write-ups about the place.
    return {
        "places": [
            {"place_id": "222", "title": "Taj Luxury Hotel Goa", "place_type": "HOTEL", "position": 1},
            {
                "place_id": "111",
                "title": "Goa",
                "place_type": "GEO",
                "position": 2,
                "reviews": 99,
                "rating": "4.5",
                "link": "https://www.tripadvisor.com/Tourism-g297604-Goa.html",
            },
        ]
    }


def _reviews_payload():
    return {
        "rating": "4.6",
        "reviews_count": 12345,
        "reviews": [
            {"snippet": "Beautiful beaches and old towns.", "author": {"name": "Priya"}, "rating": "4.5", "date": "March 2025"},
            {"snippet": "   ", "author": "Nobody"},  # no words, not a review
            {"author": "No text at all"},
        ],
    }


def test_search_resolves_to_the_destination_and_not_a_hotel_in_it(monkeypatch, serpapi_key):
    calls = []

    def fetch(url, params=None, **kwargs):
        calls.append(params or {})
        if params and params.get("engine") == "tripadvisor":
            return _search_payload()
        return _reviews_payload()

    monkeypatch.setattr(ta_mod, "fetch_with_retry", fetch)

    reviews = ta_mod.TripadvisorReviewsProvider().reviews_for("Goa")

    assert calls[0]["engine"] == "tripadvisor"
    assert calls[1]["engine"] == "tripadvisor_reviews"
    assert calls[1]["place_id"] == "111"
    assert reviews  # the hotel's reviews were never fetched


def test_reviews_are_tagged_with_their_source_and_place_totals(monkeypatch, serpapi_key):
    def fetch(url, params=None, **kwargs):
        return _search_payload() if (params or {}).get("engine") == "tripadvisor" else _reviews_payload()

    monkeypatch.setattr(ta_mod, "fetch_with_retry", fetch)

    reviews = ta_mod.TripadvisorReviewsProvider().reviews_for("Goa")

    assert len(reviews) == 1  # the two empty ones were dropped
    review = reviews[0]
    assert review["source"] == "tripadvisor"
    assert review["author"] == "Priya"
    assert review["rating"] == 4.5
    assert review["visitedAt"] == "March 2025"
    assert review["placeName"] == "Goa"
    # Totals come from the reviews payload when it has its own.
    assert review["totalReviews"] == 12345
    assert review["averageRating"] == 4.6


def test_an_unresolvable_destination_degrades_to_an_empty_list(monkeypatch, serpapi_key):
    calls = []
    monkeypatch.setattr(ta_mod, "fetch_with_retry", _fake_fetch(calls, {"places": []}))
    provider = ta_mod.TripadvisorReviewsProvider()

    assert provider.reviews_for("nowhere-like-this") == []
    assert len(calls) == 1  # no reviews call without a resolved place
    assert provider.link_for("nowhere-like-this") is None


def test_the_destination_link_survives_a_failed_reviews_call(monkeypatch, serpapi_key):
    def fetch(url, params=None, **kwargs):
        if (params or {}).get("engine") == "tripadvisor":
            return _search_payload()
        return {"error": "Your account ran out of searches."}

    monkeypatch.setattr(ta_mod, "fetch_with_retry", fetch)
    provider = ta_mod.TripadvisorReviewsProvider()

    assert provider.reviews_for("Goa") == []
    assert provider.link_for("Goa") == "https://www.tripadvisor.com/Tourism-g297604-Goa.html"
    # The place exists and the reviews call failed: an outage, not an empty page.
    assert ta_mod.last_fetch_failed("Goa") is True


def test_an_unanswerable_search_is_a_failure_while_a_wrong_name_is_a_real_empty(monkeypatch, serpapi_key):
    provider = ta_mod.TripadvisorReviewsProvider()

    monkeypatch.setattr(ta_mod, "fetch_with_retry", lambda *args, **kwargs: None)
    assert provider.reviews_for("Goa") == []
    assert ta_mod.last_fetch_failed("Goa") is True

    monkeypatch.setattr(ta_mod, "fetch_with_retry", _fake_fetch([], {"places": []}))
    reset = ta_mod.reset_tripadvisor_cache
    reset()
    assert provider.reviews_for("Goa") == []
    assert ta_mod.last_fetch_failed("Goa") is False


# ── Google ────────────────────────────────────────────────────────────────────

def test_google_empty_result_is_retried_after_the_negative_ttl(monkeypatch, serpapi_key):
    calls = []
    monkeypatch.setattr(google_mod, "fetch_with_retry", _fake_fetch(calls, {"places": []}))

    provider = google_mod.GoogleReviewsProvider()
    provider.reviews_for("goa")
    key = google_mod._cache_key("goa")
    with google_mod._cache_lock:
        google_mod._cache[key]["timestamp"] -= google_mod.NEGATIVE_CACHE_TTL_SEC + 1
    provider.reviews_for("goa")

    assert len(calls) == 2
