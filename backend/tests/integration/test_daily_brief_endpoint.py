import pytest
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

def test_v1_daily_brief_today_endpoint():
    response = client.get("/api/v1/daily-brief/today?destination=Goa")
    assert response.status_code == 200
    data = response.json()
    assert data["destination"] == "Goa"
    assert "trip_health_score" in data
    assert 0 <= data["trip_health_score"]["score"] <= 100

def test_v1_daily_brief_notifications_register_device():
    payload = {
        "user_id": "test_user_77",
        "device_token": "token_web_998877",
        "platform": "web"
    }
    response = client.post("/api/v1/daily-brief/notifications/register-device", json=payload)
    assert response.status_code == 200
    assert response.json()["registered"] is True
