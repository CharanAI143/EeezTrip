"""Tests for the discovery endpoints and the regex transcript extraction.

The catalogue fallbacks make these runnable with no AI provider configured,
which is exactly the mode a fresh clone or CI will be in.
"""
import pytest
from fastapi.testclient import TestClient

from backend.main import app
from backend.app.schemas.discovery import MoodRequest, SeasonalRequest
from backend.app.services.discovery_service import DiscoveryService

client = TestClient(app)


# --- transcript extraction -------------------------------------------------

EXTRACTIONS = [
    (
        "plan a trip from mumbai to goa for 5 days under 40000 rupees",
        {"startLocation": "Mumbai", "destination": "Goa", "budget": 40000,
         "currency": "INR", "duration": 5},
    ),
    (
        "i want to visit rishikesh in march",
        {"destination": "Rishikesh"},
    ),
    (
        "going to andaman with 20000 rupees for 4 days",
        {"destination": "Andaman", "budget": 20000, "currency": "INR", "duration": 4},
    ),
    (
        "trip to ooty under 15000",
        {"destination": "Ooty", "budget": 15000},
    ),
    (
        "from bengaluru to coorg, 3 days, 25000 rs",
        {"startLocation": "Bengaluru", "destination": "Coorg", "budget": 25000,
         "duration": 3},
    ),
    (
        "book a holiday to kerala under rs 60000",
        {"destination": "Kerala", "budget": 60000},
    ),
    (
        # An origin must not swallow the destination: both are extracted.
        "from delhi to manali for 6 days under 30000",
        {"startLocation": "Delhi", "destination": "Manali", "duration": 6},
    ),
    (
        "a trip to new delhi for 4 days",
        {"destination": "New Delhi", "duration": 4},
    ),
    (
        "take me to lonavala tomorrow",
        {"destination": "Lonavala"},
    ),
    (
        "plan something romantic",
        {"preferences": ["romantic"]},
    ),
]


@pytest.mark.parametrize("transcript,expected", EXTRACTIONS)
def test_regex_extraction(transcript, expected):
    result = DiscoveryService()._regex_extraction(transcript)
    for key, value in expected.items():
        assert result.get(key) == value, f"{key!r} in {transcript!r}"


@pytest.mark.parametrize(
    "transcript",
    ["just browsing", "what is the weather", ""],
)
def test_regex_extraction_on_non_travel_transcripts(transcript):
    assert DiscoveryService()._regex_extraction(transcript) == {}


# --- mood recommendations --------------------------------------------------

def test_mood_recommendations_scales_by_budget():
    service = DiscoveryService()
    base = service.mood_recommendations(MoodRequest(mood="adventurous", budget=50000))
    assert len(base) == 3
    assert all(item.estimatedCost > 0 for item in base)

    half = service.mood_recommendations(MoodRequest(mood="adventurous", budget=25000))
    assert [i.estimatedCost for i in half] == [i.estimatedCost // 2 for i in base]


def test_mood_recommendations_respects_count():
    service = DiscoveryService()
    assert len(service.mood_recommendations(MoodRequest(mood="romantic", count=2))) == 2
    # The curated catalogue holds three entries per mood, so it caps rather than
    # padding; the AI path can return more.
    assert len(service.mood_recommendations(MoodRequest(mood="romantic", count=8))) == 3


def test_mood_recommendations_unknown_mood_falls_back_to_relaxed():
    service = DiscoveryService()
    unknown = service.mood_recommendations(MoodRequest(mood="underwater-basketweaving"))
    relaxed = service.mood_recommendations(MoodRequest(mood="relaxed"))
    assert [i.name for i in unknown] == [i.name for i in relaxed]


def test_mood_recommendations_endpoint():
    response = client.post(
        "/api/v1/recommendations/mood",
        json={"mood": "adventurous", "budget": 45000, "currency": "INR", "count": 3},
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 3
    assert {"name", "whyMatch", "estimatedCost", "landscapeType"} <= set(data[0])


def test_mood_recommendations_validates_count():
    assert client.post(
        "/api/v1/recommendations/mood", json={"mood": "relaxed", "count": 0}
    ).status_code == 422
    assert client.post(
        "/api/v1/recommendations/mood", json={"mood": "relaxed", "count": 99}
    ).status_code == 422


# --- seasonal recommendations ---------------------------------------------

def test_seasonal_recommendations_keys():
    data = DiscoveryService().seasonal_recommendations(SeasonalRequest(location="Bengaluru", month=8))
    assert data.nearby and data.national and data.global_
    for entry in data.nearby + data.national + data.global_:
        assert entry.name and entry.description and entry.highlight and entry.type


def test_seasonal_endpoint_serialises_global_key():
    """`global` is a Python keyword, so it is aliased back to `global` on the wire."""
    response = client.post(
        "/api/v1/recommendations/seasonal", json={"location": "Bengaluru", "month": 8}
    )
    assert response.status_code == 200
    data = response.json()
    assert set(data) == {"nearby", "national", "global"}
    assert "global_" not in data
    assert data["global"]


def test_seasonal_validates_month():
    for month in (0, 13, 19):
        response = client.post(
            "/api/v1/recommendations/seasonal", json={"location": "Bengaluru", "month": month}
        )
        assert response.status_code == 422


# --- voice extraction ------------------------------------------------------

def test_voice_extract_endpoint():
    response = client.post(
        "/api/v1/voice/extract",
        json={"transcript": "plan a trip from mumbai to goa for 5 days under 40000 rupees"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["startLocation"] == "Mumbai"
    assert data["destination"] == "Goa"
    assert data["budget"] == 40000
    assert data["duration"] == 5


def test_voice_extract_rejects_blank_transcript():
    # `transcript` defaults to "", so a missing body and a blank string both 400.
    assert client.post("/api/v1/voice/extract", json={"transcript": "   "}).status_code == 400
    assert client.post("/api/v1/voice/extract", json={}).status_code == 400
