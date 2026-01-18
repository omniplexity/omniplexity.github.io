from __future__ import annotations

import asyncio
from typing import Any

from fastapi import HTTPException

from backend.app.config.settings import settings
from backend.app.providers.base import Provider
from backend.app.providers.lmstudio import LMStudioProvider
from backend.app.providers.ollama import OllamaProvider
from backend.app.providers.openai_compat import OpenAICompatProvider
from backend.app.providers.types import ModelInfo, ProviderCapabilities, ProviderHealth


class ProviderRegistry:
    def __init__(self):
        self._providers: dict[str, Provider] = {}

    def build_registry(self) -> None:
        # Always register LM Studio and Ollama
        self._providers["lmstudio"] = LMStudioProvider()
        self._providers["ollama"] = OllamaProvider()

        # Register OpenAI-compatible only if base_url is set
        if settings.openai_compat_base_url:
            self._providers["openai"] = OpenAICompatProvider(
                provider_id="openai",
                display_name="OpenAI Compatible",
                base_url=settings.openai_compat_base_url,
                api_key=settings.openai_api_key or None,
                timeout_seconds=settings.openai_timeout_seconds,
            )

    def list_providers(self) -> list[dict[str, Any]]:
        providers = []
        for provider_id, provider in self._providers.items():
            providers.append({
                "provider_id": provider_id,
                "name": provider.display_name,
                "capabilities": provider.capabilities().__dict__,
                "models": [],  # Will be filled if include_models=true
            })
        return providers

    async def list_providers_with_models(self) -> list[dict[str, Any]]:
        providers = []
        tasks = []

        for provider_id, provider in self._providers.items():
            task = asyncio.create_task(self._safe_list_models(provider_id))
            tasks.append((provider_id, provider, task))

        for provider_id, provider, task in tasks:
            try:
                models = await asyncio.wait_for(task, timeout=1.5)
            except asyncio.TimeoutError:
                models = []
            providers.append({
                "provider_id": provider_id,
                "name": provider.display_name,
                "capabilities": provider.capabilities().__dict__,
                "models": models,
            })

        return providers

    async def _safe_list_models(self, provider_id: str) -> list[dict[str, Any]]:
        try:
            provider = self.get(provider_id)
            models = await provider.list_models()
            return [{"id": m.id, "label": m.label} for m in models]
        except Exception:
            return []

    def get(self, provider_id: str) -> Provider:
        if provider_id not in self._providers:
            raise HTTPException(
                status_code=400,
                detail={"code": "PROVIDER_ERROR", "message": f"Unknown provider: {provider_id}"},
            )
        return self._providers[provider_id]

    async def list_models(self, provider_id: str) -> list[ModelInfo]:
        provider = self.get(provider_id)
        return await provider.list_models()

    async def health(self, provider_id: str) -> ProviderHealth:
        provider = self.get(provider_id)
        return await provider.healthcheck()


# Global registry instance
registry = ProviderRegistry()