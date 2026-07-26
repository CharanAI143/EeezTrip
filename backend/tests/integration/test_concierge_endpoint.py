import pytest
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

def test_v1_concierge_chat_endpoint_weather():
    payload = {
        "user_id": "test_user",
        "query": "Is it going to rain in Goa?"
    }
    response = client.post("/api/v1/concierge/chat", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["detected_intent"] == "WEATHER_QUESTION"
    assert "reply" in data

def test_v1_concierge_chat_endpoint_packing():
    payload = {
        "user_id": "test_user",
        "query": "What should I pack for my trip?"
    }
    response = client.post("/api/v1/concierge/chat", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["detected_intent"] == "PACKING_ADVICE"
    assert "reply" in data

def test_v1_concierge_chat_endpoint_short_query():
    payload = {
        "user_id": "test_user",
        "query": "a"
    }
    response = client.post("/api/v1/concierge/chat", json=payload)
    assert response.status_code == 422
