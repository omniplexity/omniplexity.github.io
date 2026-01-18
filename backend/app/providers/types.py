from __future__ import annotations

from dataclasses import dataclass
from typing import Literal


@dataclass
class ModelInfo:
    id: str
    label: str | None = None
    context_length: int | None = None
    raw: dict | None = None


@dataclass
class ProviderCapabilities:
    streaming: bool
    vision: bool
    tools: bool
    json_mode: bool
    max_context_tokens: int | None


@dataclass
class ProviderHealth:
    ok: bool
    detail: str | None = None


@dataclass
class StreamEvent:
    type: Literal["delta", "usage", "done"]
    delta: str | None = None
    usage: dict | None = None