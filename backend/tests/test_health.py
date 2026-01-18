import pytest
import tempfile
import os
from pathlib import Path
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from alembic.config import Config
from alembic import command

from backend.app.main import app
from backend.app.db.models import Base
from backend.app.db.repo.messages_repo import append_message
from backend.app.db.engine import reset_engine_for_tests
from backend.app.db.session import reset_sessionmaker_for_tests
from backend.app.config.settings import settings


def test_health():
    client = TestClient(app)
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data == {"status": "healthy"}


def test_version():
    client = TestClient(app)
    response = client.get("/version")
    assert response.status_code == 200
    assert response.json() == {"version": "0.1.0"}


def test_db_migration():
    """Test that database tables exist after migration."""
    client = TestClient(app)
    # Use /health/deep to verify DB connectivity and tables exist
    response = client.get("/health/deep")
    assert response.status_code == 200
    data = response.json()
    assert data["db"]["ok"] is True
    assert data["db"]["dialect"] == "sqlite"
    assert isinstance(data["db"]["latency_ms"], (int, float))


def test_migrations_apply_to_temp_db():
    """Test that migrations apply successfully to a temporary SQLite database."""
    with tempfile.TemporaryDirectory() as tmpdir:
        db_path = Path(tmpdir) / "test.db"
        db_url = f"sqlite:///{db_path}"

        # Configure Alembic for temp DB
        alembic_cfg = Config(Path("alembic.ini"))
        alembic_cfg.set_main_option("sqlalchemy.url", db_url)
        alembic_cfg.set_main_option("script_location", "migrations")

        # Run migrations (should not raise)
        command.upgrade(alembic_cfg, "head")


def test_health_deep_origin_lock(monkeypatch):
    """Test /health/deep is protected by origin lock."""
    # Enable origin lock and test environment
    monkeypatch.setattr(settings, "origin_lock_enabled", True)
    monkeypatch.setattr(settings, "origin_lock_secret", "test-secret")
    monkeypatch.setattr(settings, "environment", "test")

    client = TestClient(app)

    # Without X-Origin-Secret: 403 for external client
    response = client.get("/health/deep", headers={"X-Test-Client-IP": "8.8.8.8"})
    assert response.status_code == 403
    assert response.json()["code"] == "ORIGIN_LOCKED"

    # With X-Origin-Secret: 200 and includes latency_ms
    response = client.get("/health/deep", headers={"X-Test-Client-IP": "8.8.8.8", "X-Origin-Secret": "test-secret"})
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "db" in data
    assert data["db"]["ok"] is True
    assert data["db"]["dialect"] == "sqlite"
    assert isinstance(data["db"]["latency_ms"], (int, float))


def test_health_deep_origin_lock_enforced(monkeypatch):
    """Test /health/deep origin lock enforced."""
    monkeypatch.setattr(settings, "environment", "test")
    monkeypatch.setattr(settings, "origin_lock_enabled", True)
    monkeypatch.setattr(settings, "origin_lock_secret", "test-secret")

    client = TestClient(app)

    # GET /health/deep with X-Test-Client-IP=8.8.8.8 and no X-Origin-Secret => 403
    response = client.get("/health/deep", headers={"X-Test-Client-IP": "8.8.8.8"})
    assert response.status_code == 403

    # same with X-Origin-Secret="test-secret" => 200
    response = client.get("/health/deep", headers={"X-Test-Client-IP": "8.8.8.8", "X-Origin-Secret": "test-secret"})
    assert response.status_code == 200


def test_health_deep_db_failure(monkeypatch):
    """Test /health/deep returns 503 when DB fails."""
    # Enable origin lock and test environment
    monkeypatch.setattr(settings, "origin_lock_enabled", True)
    monkeypatch.setattr(settings, "origin_lock_secret", "test-secret")
    monkeypatch.setattr(settings, "environment", "test")

    # Mock the get_db dependency to return a session that raises on execute
    from unittest.mock import Mock
    mock_session = Mock()
    mock_session.execute.side_effect = Exception("DB connection failed")

    from backend.app.db.session import get_db
    try:
        app.dependency_overrides[get_db] = lambda: mock_session
        client = TestClient(app)

        # With correct X-Origin-Secret, but DB fails: should get 503
        response = client.get("/health/deep", headers={"X-Test-Client-IP": "8.8.8.8", "X-Origin-Secret": "test-secret"})
        assert response.status_code == 503
        data = response.json()
        assert data["code"] == "DEEP_HEALTH_FAILED"
        assert data["message"] == "Deep health check failed"
        assert "request_id" in data
    finally:
        app.dependency_overrides.pop(get_db, None)


def test_json_fields_accept_dict():
    """Test that JSON fields in messages accept dict payloads."""
    with tempfile.TemporaryDirectory() as tmpdir:
        db_path = Path(tmpdir) / "test.db"
        db_url = f"sqlite:///{db_path}"

        # Create engine and run migrations
        engine = create_engine(db_url)
        try:
            Base.metadata.create_all(bind=engine)

            from sqlalchemy.orm import sessionmaker
            SessionLocal = sessionmaker(bind=engine)

            with SessionLocal() as session:
                # Test append_message with dict payloads
                provider_meta = {"model": "gpt-4", "temperature": 0.7}
                token_usage = {"prompt_tokens": 10, "completion_tokens": 20, "total_tokens": 30}

                message = append_message(
                    session=session,
                    conversation_id=1,  # Doesn't exist but that's ok for this test
                    role="user",
                    content="Hello",
                    provider_meta=provider_meta,
                    token_usage=token_usage,
                )

                # Verify the message was created with dict data
                assert message.provider_meta == provider_meta
                assert message.token_usage == token_usage

                session.commit()
        finally:
            engine.dispose()