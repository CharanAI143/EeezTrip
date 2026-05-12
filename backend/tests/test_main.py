import pytest
from fastapi.testclient import TestClient
from backend.main import app
import json

client = TestClient(app)

def test_health_check():
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"ok": True, "version": "2.0.0"}

def test_get_images_invalid_params():
    # 'place' is required and must be at least 2 chars
    response = client.get("/api/images?place=a")
    assert response.status_code == 422

def test_recommend_trip_normal_mode():
    # Normal mode uses build_fast_trip (template based)
    payload = {
        "origin": "Bangalore",
        "destination": "Goa",
        "mood": "Relaxed",
        "budget": 30000,
        "days": 3,
        "mode": "normal"
    }
    response = client.post("/api/recommend", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["destination"] == "Goa"
    assert "daily_plan" in data
    assert len(data["daily_plan"]) == 3

def test_chat_empty_messages():
    response = client.post("/api/chat", json={"messages": []})
    assert response.status_code == 400

def test_db_status_disconnected():
    # Assuming MongoDB is not connected in the test environment
    response = client.get("/api/db/status")
    assert response.status_code == 200
    data = response.json()
    assert "connected" in data

if __name__ == "__main__":
    pytest.main([__file__])
