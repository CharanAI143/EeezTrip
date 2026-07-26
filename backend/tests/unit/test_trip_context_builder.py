import pytest
from backend.app.services.trip_context_builder import TripContextBuilder

def test_trip_context_builder_builds_context():
    session_data = {
        "session_id": "session_abc",
        "preferences": {
            "destination": "Paris",
            "origin": "London",
            "mood": "Romantic",
            "budget": 100000,
            "days": 4
        },
        "current_itinerary": {
            "title": "Romantic Paris Getaway",
            "summary": "4 days in Paris"
        },
        "revision_history": [
            {
                "instruction": "Make it cheaper",
                "change_summary": "Reduced hotel budget",
                "timestamp": "2026-07-26T12:00:00Z"
            }
        ]
    }

    ctx_str = TripContextBuilder.build_context_string(session_data)
    assert "SINGLE SOURCE OF TRUTH: TRIP SESSION CONTEXT" in ctx_str
    assert "Destination: Paris" in ctx_str
    assert "Make it cheaper" in ctx_str

    summary = TripContextBuilder.build_summary_dict(session_data)
    assert summary["destination"] == "Paris"
    assert summary["revision_count"] == 1
