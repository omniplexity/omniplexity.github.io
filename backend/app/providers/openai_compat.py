from __future__ import annotations

import json
from typing import AsyncIterator

import httpx
from fastapi import HTTPException

from backend.app.providers.base import Provider
from backend.app.providers.types import ModelInfo, ProviderCapabilities, ProviderHealth, StreamEvent


class OpenAICompatProvider(Provider):
    def __init__(
        self,
        provider_id: str,
        display_name: str,
        base_url: str,
        api_key: str | None = None,
        timeout_seconds: int = 120,
        client: httpx.AsyncClient | None = None,
    ):
        self.provider_id = provider_id
        self.display_name = display_name
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key
        self.timeout_seconds = timeout_seconds
        self._client = client or httpx.AsyncClient(timeout=self.timeout_seconds)

    def _headers(self) -> dict[str, str]:
        headers = {"Content-Type": "application/json"}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"
        return headers

    def _map_error(self, exc: Exception) -> None:
        if isinstance(exc, httpx.ConnectError):
            raise HTTPException(
                status_code=503,
                detail={"code": "PROVIDER_UNREACHABLE", "message": "Provider is unreachable"},
            )
        elif isinstance(exc, httpx.ReadTimeout):
            raise HTTPException(
                status_code=504,
                detail={"code": "PROVIDER_TIMEOUT", "message": "Provider request timed out"},
            )
        elif isinstance(exc, httpx.HTTPStatusError):
            if exc.response.status_code == 429:
                raise HTTPException(
                    status_code=429,
                    detail={"code": "RATE_LIMITED", "message": "Provider rate limit exceeded"},
                )
            elif exc.response.status_code == 404:
                # Check if response mentions model not found
                try:
                    data = exc.response.json()
                    if "model" in str(data).lower() and ("not found" in str(data).lower() or "does not exist" in str(data).lower()):
                        raise HTTPException(
                            status_code=400,
                            detail={"code": "MODEL_NOT_FOUND", "message": "Requested model not found"},
                        )
                except Exception:
                    pass
            raise HTTPException(
                status_code=502,
                detail={"code": "PROVIDER_ERROR", "message": "Provider returned an error"},
            )
        else:
            raise HTTPException(
                status_code=502,
                detail={"code": "PROVIDER_ERROR", "message": "Provider communication failed"},
            )

    async def list_models(self) -> list[ModelInfo]:
        try:
            response = await self._client.get(f"{self.base_url}/models", headers=self._headers())
            response.raise_for_status()
            data = response.json()
            models = []
            for model_data in data.get("data", []):
                models.append(
                    ModelInfo(
                        id=model_data["id"],
                        label=model_data.get("id"),  # Use id as label if no owned_by
                        raw=model_data,
                    )
                )
            return models
        except Exception as exc:
            self._map_error(exc)
            return []  # Should not reach here

    async def chat_once(self, req: dict) -> dict:
        req["stream"] = False
        try:
            response = await self._client.post(
                f"{self.base_url}/chat/completions",
                headers=self._headers(),
                json=req,
            )
            response.raise_for_status()
            return response.json()
        except Exception as exc:
            self._map_error(exc)
            return {}  # Should not reach here

    async def chat_stream(self, req: dict) -> AsyncIterator[StreamEvent]:
        req["stream"] = True
        try:
            async with self._client.stream(
                "POST",
                f"{self.base_url}/chat/completions",
                headers=self._headers(),
                json=req,
            ) as response:
                response.raise_for_status()
                async for line in response.aiter_lines():
                    line = line.strip()
                    if not line or not line.startswith("data: "):
                        continue
                    data = line[6:]  # Remove "data: "
                    if data == "[DONE]":
                        yield StreamEvent(type="done")
                        break
                    try:
                        chunk = json.loads(data)
                        if "choices" in chunk and chunk["choices"]:
                            choice = chunk["choices"][0]
                            if "delta" in choice and "content" in choice["delta"]:
                                yield StreamEvent(type="delta", delta=choice["delta"]["content"])
                        if "usage" in chunk:
                            yield StreamEvent(type="usage", usage=chunk["usage"])
                    except json.JSONDecodeError:
                        continue
        except Exception as exc:
            self._map_error(exc)

    async def healthcheck(self) -> ProviderHealth:
        try:
            await self.list_models()
            return ProviderHealth(ok=True)
        except Exception as exc:
            detail = str(exc.detail.get("message", "Unknown error")) if hasattr(exc, "detail") else str(exc)
            return ProviderHealth(ok=False, detail=detail)

    def capabilities(self) -> ProviderCapabilities:
        return ProviderCapabilities(
            streaming=True,
            vision=False,  # Assume no vision for now
            tools=False,  # Assume no tools for now
            json_mode=False,  # Assume no json_mode for now
            max_context_tokens=None,  # Unknown
        )