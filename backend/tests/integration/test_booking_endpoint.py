import pytest
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

def test_v1_booking_opportunities_endpoint():
    response = client.get("/api/v1/booking/opportunities?destination=Goa")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 1
    assert "offer" in data[0]
