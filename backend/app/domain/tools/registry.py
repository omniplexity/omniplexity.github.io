"""Tool registry for backend integrations."""
from dataclasses import dataclass
from typing import Any, Callable


@dataclass
class ToolSpec:
    name: str
    description: str
    handler: Callable[..., Any]
    enabled: bool = True


class ToolRegistry:
    def __init__(self) -> None:
        self._tools: dict[str, ToolSpec] = {}

    def register(self, tool: ToolSpec) -> None:
        self._tools[tool.name] = tool

    def list_tools(self) -> list[ToolSpec]:
        return list(self._tools.values())


registry = ToolRegistry()
