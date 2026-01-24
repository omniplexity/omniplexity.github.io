"""Provider registry facade for domain services."""
from __future__ import annotations

import inspect

from backend.app.providers.registry import registry


def get_provider(provider_id: str):
    return registry.get(provider_id)


async def list_available_models() -> dict[str, list[str]]:
    available: dict[str, list[str]] = {}
    for provider in registry.list_providers():
        provider_id = provider.get("provider_id")
        if not provider_id:
            continue
        models = registry.get(provider_id).list_models()
        if inspect.isawaitable(models):
            models = await models
        available[provider_id] = [getattr(m, "id", str(m)) for m in models]
    return available


__all__ = ["get_provider", "list_available_models", "registry"]
