import pytest
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

def test_v1_personalization_profile_endpoint():
    response = client.get("/api/v1/personalization/profile")
    assert response.status_code == 200
    data = response.json()
    assert "user_id" in data
    assert "food_interest" in data

def test_v1_personalization_update_preference_endpoint():
    response = client.post("/api/v1/personalization/preferences?key=budget_level&value=luxury")
    assert response.status_code == 200
    data = response.json()
    assert data["budget_level"]["value"] == "luxury"
    assert data["budget_level"]["source"] == "EXPLICIT"
