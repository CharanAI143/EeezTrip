import pytest
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

def test_v1_create_session_endpoint():
    payload = {
        "user_id": "user_test_1",
        "preferences": {
            "origin": "Bangalore",
            "destination": "Goa",
            "mood": "Relaxed",
            "budget": 30000,
            "days": 3
        },
        "itinerary": {
            "destination": "Goa",
            "title": "Relaxed Goa Escape",
            "tagline": "Unplug & unwind",
            "summary": "3 days in Goa",
            "best_time": "Spring",
            "highlights": ["Beach"],
            "daily_plan": [],
            "cozy_tips": [],
            "must_try_food": [],
            "estimated_cost_breakdown": {
                "accommodation": 12000,
                "food": 7500,
                "transport": 4500,
                "activities": 3600,
                "misc": 2400
            }
        }
    }

    response = client.post("/api/v1/sessions/create", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert "session_id" in data
    assert data["preferences"]["destination"] == "Goa"
