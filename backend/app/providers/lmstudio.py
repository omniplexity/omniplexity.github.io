from __future__ import annotations

from backend.app.config.settings import settings
from backend.app.providers.openai_compat import OpenAICompatProvider


class LMStudioProvider(OpenAICompatProvider):
    def __init__(self, client=None):
        super().__init__(
            provider_id="lmstudio",
            display_name="LM Studio",
            base_url=settings.lmstudio_base_url,
            api_key=None,  # LM Studio doesn't require API key
            timeout_seconds=settings.lmstudio_timeout_seconds,
            client=client,
        )