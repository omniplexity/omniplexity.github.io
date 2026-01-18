from __future__ import annotations

from typing import AsyncIterator, Protocol

from backend.app.providers.types import ModelInfo, ProviderCapabilities, ProviderHealth, StreamEvent


class Provider(Protocol):
    provider_id: str
    display_name: str

    def list_models(self) -> list[ModelInfo]:
        ...

    def chat_once(self, req: dict) -> dict:
        ...

    def chat_stream(self, req: dict) -> AsyncIterator[StreamEvent]:
        ...

    def healthcheck(self) -> ProviderHealth:
        ...

    def capabilities(self) -> ProviderCapabilities:
        ...