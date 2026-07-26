import pytest
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

def test_v1_recommendation_endpoint_success():
    payload = {
        "origin": "Bangalore",
        "destination": "Goa",
        "mood": "Relaxed",
        "budget": 30000,
        "days": 3,
        "mode": "normal"
    }
    response = client.post("/api/v1/recommendations/generate", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["destination"] == "Goa"
    assert "daily_plan" in data
    assert len(data["daily_plan"]) == 3
    assert "estimated_cost_breakdown" in data

def test_v1_recommendation_endpoint_invalid_budget():
    payload = {
        "origin": "Bangalore",
        "destination": "Goa",
        "mood": "Relaxed",
        "budget": -500,
        "days": 3
    }
    response = client.post("/api/v1/recommendations/generate", json=payload)
    assert response.status_code == 400
    assert "Budget must be a positive integer" in response.json()["detail"]
