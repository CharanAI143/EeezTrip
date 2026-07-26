import pytest
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

def test_v1_intelligence_insights_endpoint():
    response = client.get("/api/v1/intelligence/insights?destination=Goa")
    assert response.status_code == 200
    data = response.json()
    assert data["destination"] == "Goa"
    assert "insights" in data
    assert len(data["insights"]) > 0

def test_v1_intelligence_insights_invalid_destination():
    response = client.get("/api/v1/intelligence/insights?destination=a")
    assert response.status_code == 422
