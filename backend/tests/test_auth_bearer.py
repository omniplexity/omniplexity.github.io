import pytest

from backend.app.config.settings import settings


def test_bearer_login_and_me(client, monkeypatch):
    monkeypatch.setattr(settings, "auth_mode", "bearer")
    monkeypatch.setattr(settings, "jwt_secret", "test-jwt-secret")
    monkeypatch.setattr(settings, "jwt_access_ttl_seconds", 60)

    # Bootstrap admin (bearer mode returns tokens)
    bootstrap = client.post(
        "/admin/bootstrap",
        json={"username": "admin", "password": "adminpass"},
        headers={"X-Bootstrap-Token": "test-bootstrap-token"},
    )
    assert bootstrap.status_code == 200

    # Login to get access token
    login = client.post("/auth/login", json={"username": "admin", "password": "adminpass"})
    assert login.status_code == 200
    payload = login.json()
    assert "access_token" in payload
    assert "expires_in" in payload

    # /me without token should fail
    no_token = client.get("/auth/me")
    assert no_token.status_code == 401

    # /me with token should succeed
    token = payload["access_token"]
    me = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200
    assert me.json()["user"]["username"] == "admin"


def test_bearer_refresh_flow(client, monkeypatch):
    monkeypatch.setattr(settings, "auth_mode", "bearer")
    monkeypatch.setattr(settings, "jwt_secret", "test-jwt-secret")
    monkeypatch.setattr(settings, "jwt_access_ttl_seconds", 60)

    client.post(
        "/admin/bootstrap",
        json={"username": "admin", "password": "adminpass"},
        headers={"X-Bootstrap-Token": "test-bootstrap-token"},
    )

    login = client.post("/auth/login", json={"username": "admin", "password": "adminpass"})
    refresh_token = login.json().get("refresh_token")
    assert refresh_token

    refresh = client.post("/auth/refresh", json={"refresh_token": refresh_token})
    assert refresh.status_code == 200
    refresh_payload = refresh.json()
    assert "access_token" in refresh_payload
    assert "refresh_token" in refresh_payload
