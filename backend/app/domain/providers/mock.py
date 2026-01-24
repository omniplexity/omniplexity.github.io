"""Mock provider placeholder."""
from backend.app.providers.base import Provider
from backend.app.providers.types import ModelInfo, ProviderCapabilities, ProviderHealth, StreamEvent


class MockProvider(Provider):
    provider_id = "mock"
    display_name = "Mock Provider"

    def list_models(self) -> list[ModelInfo]:
        return []

    def chat_once(self, _req: dict) -> dict:
        return {"content": "", "usage": {}}

    async def chat_stream(self, _req: dict):
        if False:
            yield StreamEvent(type="done")

    def healthcheck(self) -> ProviderHealth:
        return ProviderHealth(ok=True, detail="mock")

    def capabilities(self) -> ProviderCapabilities:
        return ProviderCapabilities(streaming=False, vision=False, tools=False, json_mode=False, max_context_tokens=0)

__all__ = ["MockProvider"]
