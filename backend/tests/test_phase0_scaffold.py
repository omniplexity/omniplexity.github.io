import pytest


def test_health_endpoint_available(client):
    response = client.get("/health")
    assert response.status_code == 200
    payload = response.json()
    assert payload.get("status") in {"ok", "degraded", "error", "healthy"}
