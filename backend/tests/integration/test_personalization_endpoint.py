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

def test_v1_personalization_profile_exposes_home_region():
    # The landing page themes its weather from this field, so it has to be
    # present in the response rather than only in the model.
    response = client.get("/api/v1/personalization/profile")
    assert response.status_code == 200
    data = response.json()
    assert "home_region" in data
    # "auto" is the default: derive the region from the browser timezone.
    assert data["home_region"]["value"] == "auto"

def test_v1_personalization_update_home_region():
    response = client.post("/api/v1/personalization/preferences?key=home_region&value=europe")
    assert response.status_code == 200
    data = response.json()
    assert data["home_region"]["value"] == "europe"
    assert data["home_region"]["source"] == "EXPLICIT"

    # Reset so the shared engine instance does not leak into other tests.
    client.delete("/api/v1/personalization/profile")
