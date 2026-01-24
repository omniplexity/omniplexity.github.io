import json
import pytest

from backend.app.config.settings import settings
from backend.app.db.models import Conversation, Project, User
from backend.app.domain.services.model_selection import select_provider_model
from backend.app.providers.registry import registry
from backend.app.providers.types import ModelInfo, ProviderCapabilities, ProviderHealth, StreamEvent


class StaticProvider:
    def __init__(self, provider_id: str, models: list[str]):
        self.provider_id = provider_id
        self.display_name = provider_id
        self._models = models

    def list_models(self) -> list[ModelInfo]:
        return [ModelInfo(id=model_id, label=model_id) for model_id in self._models]

    async def chat_stream(self, req: dict):
        yield StreamEvent(type="delta", delta="Hello")
        yield StreamEvent(type="done")

    def chat_once(self, req: dict):
        return {"content": "Hello"}

    def healthcheck(self) -> ProviderHealth:
        return ProviderHealth(ok=True)

    def capabilities(self) -> ProviderCapabilities:
        return ProviderCapabilities(streaming=True, vision=False, tools=False, json_mode=False, max_context_tokens=4096)


def parse_sse(response):
    events = []
    lines = list(response.iter_lines())
    current_event = "message"
    i = 0
    while i < len(lines):
        line = lines[i]
        if isinstance(line, bytes):
            line = line.decode("utf-8")
        if line.startswith("event:"):
            current_event = line.split(":", 1)[1].strip()
            i += 1
            continue
        if line.startswith("data:"):
            data_str = line.split(":", 1)[1].strip()
            try:
                data = json.loads(data_str)
                events.append({"event": current_event, "data": data})
            except json.JSONDecodeError:
                pass
            i += 1
            continue
        i += 1
    return events


def test_stream_creates_conversation_when_missing(authenticated_client):
    original = registry._providers.copy()
    registry._providers.clear()
    registry._providers["lmstudio"] = StaticProvider("lmstudio", ["alpha-model"])

    response = authenticated_client.post(
        "/chat/stream",
        json={"message": {"role": "user", "content": "hello"}},
        headers={"X-CSRF-Token": authenticated_client.csrf_token},
    )
    assert response.status_code == 200
    events = parse_sse(response)
    assert events[0]["event"] == "meta"
    assert events[0]["data"]["conversation_id"]
    assert events[0]["data"]["provider"] == "lmstudio"
    assert events[0]["data"]["model"] == "alpha-model"

    registry._providers.clear()
    registry._providers.update(original)


def test_stream_with_invalid_conversation_id_creates_new(authenticated_client):
    original = registry._providers.copy()
    registry._providers.clear()
    registry._providers["lmstudio"] = StaticProvider("lmstudio", ["alpha-model"])

    response = authenticated_client.post(
        "/chat/stream",
        json={"conversation_id": 999999, "message": {"role": "user", "content": "hello"}},
        headers={"X-CSRF-Token": authenticated_client.csrf_token},
    )
    assert response.status_code == 200
    events = parse_sse(response)
    meta = events[0]["data"]
    assert meta["conversation_id"] != 999999

    registry._providers.clear()
    registry._providers.update(original)


def test_stream_with_valid_conversation_id_reuses(authenticated_client):
    original = registry._providers.copy()
    registry._providers.clear()
    registry._providers["lmstudio"] = StaticProvider("lmstudio", ["alpha-model"])

    conv = authenticated_client.post(
        "/conversations",
        json={"title": "Stream Test"},
        headers={"X-CSRF-Token": authenticated_client.csrf_token},
    )
    conv_id = conv.json()["id"]

    response = authenticated_client.post(
        "/chat/stream",
        json={"conversation_id": conv_id, "message": {"role": "user", "content": "hello"}},
        headers={"X-CSRF-Token": authenticated_client.csrf_token},
    )
    assert response.status_code == 200
    events = parse_sse(response)
    meta = events[0]["data"]
    assert meta["conversation_id"] == conv_id

    registry._providers.clear()
    registry._providers.update(original)


@pytest.mark.asyncio
async def test_model_selection_priority(db_session, monkeypatch):
    user = User(username="priority-user", password_hash="x", role="user", status="active")
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    project = Project(user_id=user.id, name="proj", default_provider="projectprov", default_model="proj-model")
    db_session.add(project)
    db_session.commit()
    db_session.refresh(project)

    conversation = Conversation(
        user_id=user.id,
        title="conv",
        provider="convprov",
        model="conv-model",
        project_id=project.id,
    )
    db_session.add(conversation)
    user.default_provider = "userprov"
    user.default_model = "user-model"
    db_session.commit()

    original = registry._providers.copy()
    registry._providers.clear()
    registry._providers["convprov"] = StaticProvider("convprov", ["conv-model"])
    registry._providers["projectprov"] = StaticProvider("projectprov", ["proj-model"])
    registry._providers["userprov"] = StaticProvider("userprov", ["user-model"])

    provider_id, model = await select_provider_model(user, project, conversation)
    assert provider_id == "convprov"
    assert model == "conv-model"

    conversation.model = "missing-model"
    db_session.commit()

    provider_id, model = await select_provider_model(user, project, conversation)
    assert provider_id == "projectprov"
    assert model == "proj-model"

    registry._providers.clear()
    registry._providers.update(original)


def test_no_models_available_returns_error(authenticated_client, monkeypatch):
    original = registry._providers.copy()
    registry._providers.clear()
    registry._providers["emptyprov"] = StaticProvider("emptyprov", [])

    monkeypatch.setattr(settings, "provider_priority", ["emptyprov"])
    monkeypatch.setattr(settings, "default_provider", "")
    monkeypatch.setattr(settings, "default_model", "")

    response = authenticated_client.post(
        "/chat/stream",
        json={"message": {"role": "user", "content": "hello"}},
        headers={"X-CSRF-Token": authenticated_client.csrf_token},
    )
    assert response.status_code == 200
    events = parse_sse(response)
    error_events = [e for e in events if e["event"] == "error"]
    assert error_events
    assert error_events[0]["data"]["code"] == "no_models_available"

    registry._providers.clear()
    registry._providers.update(original)
