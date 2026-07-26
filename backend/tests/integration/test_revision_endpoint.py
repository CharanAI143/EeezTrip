import pytest
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

def test_v1_revision_endpoint_success():
    payload = {
        "preferences": {
            "origin": "Mumbai",
            "destination": "Kochi",
            "mood": "Relaxed",
            "budget": 35000,
            "days": 3
        },
        "current_plan": {
            "destination": "Kochi",
            "title": "Kochi Backwaters Getaway",
            "tagline": "Peaceful waters",
            "summary": "3-day relaxed journey",
            "best_time": "Winter",
            "highlights": ["Fort Kochi", "Backwaters"],
            "daily_plan": [
                {
                    "day": 1,
                    "title": "Arrival",
                    "morning": "Arrive in Kochi",
                    "midday": "Seafood lunch",
                    "afternoon": "Fort Kochi walk",
                    "evening": "Sunset cruise",
                    "tip": "Hire guide"
                }
            ],
            "cozy_tips": ["Stay near beach"],
            "must_try_food": ["Kerala Fish Curry"],
            "estimated_cost_breakdown": {
                "accommodation": 14000,
                "food": 8750,
                "transport": 5250,
                "activities": 4200,
                "misc": 2800
            }
        },
        "instruction": "Add more food tasting experiences"
    }

    response = client.post("/api/v1/trips/revise", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "revised_plan" in data
    assert "change_summary" in data
    assert "reasoning" in data

def test_v1_revision_endpoint_invalid_instruction():
    payload = {
        "preferences": {
            "origin": "Mumbai",
            "destination": "Kochi",
            "mood": "Relaxed",
            "budget": 35000,
            "days": 3
        },
        "current_plan": {
            "destination": "Kochi",
            "title": "Kochi Tour",
            "tagline": "Tagline",
            "summary": "Summary",
            "best_time": "Winter",
            "highlights": [],
            "daily_plan": [],
            "cozy_tips": [],
            "must_try_food": [],
            "estimated_cost_breakdown": {
                "accommodation": 10000, "food": 5000, "transport": 3000, "activities": 2000, "misc": 0
            }
        },
        "instruction": "x"
    }
    response = client.post("/api/v1/trips/revise", json=payload)
    assert response.status_code == 422
    assert "string_too_short" in response.text or "at least 3 characters" in response.text
