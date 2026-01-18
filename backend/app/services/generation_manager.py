from __future__ import annotations

import asyncio
import time
from dataclasses import dataclass
from typing import Dict

from backend.app.config.settings import settings


@dataclass
class GenerationState:
    task: asyncio.Task
    user_id: int
    conversation_id: int
    provider_id: str
    model_id: str
    created_at: float
    canceled: bool = False


class GenerationManager:
    """Manages active chat generations with cancellation support."""

    def __init__(self):
        self._generations: Dict[str, GenerationState] = {}
        self._lock = asyncio.Lock()

    async def start_generation(
        self, generation_id: str, user_id: int, conversation_id: int, provider_id: str, model_id: str, task: asyncio.Task
    ) -> None:
        """Register a new generation."""
        async with self._lock:
            self._generations[generation_id] = GenerationState(
                task=task,
                user_id=user_id,
                conversation_id=conversation_id,
                provider_id=provider_id,
                model_id=model_id,
                created_at=time.time(),
            )

    async def cancel_generation(self, generation_id: str, user_id: int) -> bool:
        """Cancel a generation if it exists and belongs to the user. Returns True if canceled."""
        async with self._lock:
            state = self._generations.get(generation_id)
            if not state or state.user_id != user_id:
                return False

            state.canceled = True
            if not state.task.done():
                state.task.cancel()
            return True

    def is_canceled(self, generation_id: str) -> bool:
        """Check if a generation has been canceled."""
        state = self._generations.get(generation_id)
        return state.canceled if state else False

    async def cleanup_generation(self, generation_id: str) -> None:
        """Remove a completed generation from tracking."""
        async with self._lock:
            self._generations.pop(generation_id, None)

    def get_active_generations(self, user_id: int) -> list[str]:
        """Get list of active generation IDs for a user."""
        return [
            gen_id for gen_id, state in self._generations.items()
            if state.user_id == user_id and not state.canceled and not state.task.done()
        ]


# Global instance
generation_manager = GenerationManager()