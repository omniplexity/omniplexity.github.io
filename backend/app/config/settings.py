from __future__ import annotations

from pathlib import Path
import json
from typing import Literal

from pydantic import ConfigDict, Field, AliasChoices, field_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Prefer repo-root .env, then backend/.env, then env vars.
    model_config = ConfigDict(env_file=("../.env", ".env"), extra="ignore")

    host: str = "127.0.0.1"
    port: int = 8787
    log_level: str = "INFO"
    environment: str = Field(default="dev", validation_alias=AliasChoices("ENV", "ENVIRONMENT"))

    # Comma-separated support can be layered later; for now keep list[str]
    cors_origins: list[str] = ["https://omniplexity.github.io"]

    # Model selection defaults/priorities
    provider_priority: list[str] = ["lm_studio", "ollama", "openai_compat"]
    model_priority: list[str] = ["qwen", "deepseek", "llama", "gpt"]
    default_provider: str = ""
    default_model: str = ""

    # Auth configuration
    auth_mode: Literal["auto", "bearer", "session"] = "auto"
    jwt_secret: str = "dev-jwt-secret-change-in-prod"
    jwt_access_ttl_seconds: int = 900

    # Data directories
    data_dir: str = ""
    upload_dir: str = ""
    api_public_origin: str = ""

    # Database - compute repo-root path deterministically
    database_url: str = ""

    # Auth
    secret_key: str = "dev-secret-key-change-in-prod"  # Required in prod; allow dev defaults but warn
    csrf_secret: str = "dev-csrf-secret-change-in-prod"  # Required in prod
    session_cookie_name: str = "omniplexity_session"
    session_ttl_seconds: int = 86400 * 7  # 7 days
    cookie_secure: bool = False  # Dev-safe default; set True in production .env
    cookie_samesite: str = "lax"  # Dev-safe default; set "None" in production .env

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, value):
        if isinstance(value, str):
            raw = value.strip()
            if not raw:
                return []
            if raw.startswith("["):
                try:
                    return json.loads(raw)
                except json.JSONDecodeError:
                    return [item.strip() for item in raw.strip("[]").split(",") if item.strip()]
            return [item.strip() for item in raw.split(",") if item.strip()]
        return value

    @field_validator("provider_priority", "model_priority", mode="before")
    @classmethod
    def parse_priority_lists(cls, value):
        if isinstance(value, str):
            raw = value.strip()
            if not raw:
                return []
            if raw.startswith("["):
                try:
                    return json.loads(raw)
                except json.JSONDecodeError:
                    return [item.strip() for item in raw.strip("[]").split(",") if item.strip()]
            return [item.strip() for item in raw.split(",") if item.strip()]
        return value

    def __init__(self, **data):
        super().__init__(**data)
        repo_root = Path(__file__).resolve().parents[3]

        if not self.data_dir:
            self.data_dir = str(repo_root / "data")

        if not self.upload_dir:
            self.upload_dir = str(repo_root / "uploads")

        if not self.database_url:  # Only set default if not overridden by env
            db_path = Path(self.data_dir) / "omniplexity.db"
            self.database_url = f"sqlite:///{db_path.as_posix()}"

        if not self.memory_chroma_path:
            chroma_path = Path(self.data_dir) / "chroma"
            self.memory_chroma_path = str(chroma_path)

        # Allow embeddings to piggyback on OpenAI-compatible settings
        if not self.memory_embedding_base_url and self.openai_compat_base_url:
            self.memory_embedding_base_url = self.openai_compat_base_url
        if not self.memory_embedding_api_key and self.openai_api_key:
            self.memory_embedding_api_key = self.openai_api_key

        # Set production cookie defaults if not in dev environment
        if self.environment != "dev":
            # Only override if not explicitly set via env
            if 'cookie_secure' not in data:
                self.cookie_secure = True
            if 'cookie_samesite' not in data:
                self.cookie_samesite = "None"
    invite_only: bool = True
    admin_bootstrap_token: str = "dev-bootstrap-token-change-in-prod"  # One-time use

    # Providers
    lmstudio_base_url: str = "http://127.0.0.1:1234/v1"
    lmstudio_timeout_seconds: int = 120
    ollama_base_url: str = "http://127.0.0.1:11434"
    ollama_timeout_seconds: int = 120
    openai_compat_base_url: str = ""
    openai_api_key: str = ""
    openai_timeout_seconds: int = 120

    # SSE
    sse_heartbeat_seconds: int = 15
    sse_client_disconnect_grace_seconds: int = 2

    # Memory (Chroma vector store)
    memory_enabled: bool = True
    memory_chroma_path: str = ""
    memory_collection: str = "omni_memory"
    memory_top_k: int = 6
    memory_min_score: float = 0.2
    memory_max_chars: int = 1200
    memory_auto_ingest_user_messages: bool = True
    memory_auto_ingest_assistant_messages: bool = False
    memory_embedding_backend: str = "auto"  # auto|hash|openai_compat
    memory_embedding_model: str = "text-embedding-3-small"
    memory_embedding_base_url: str = ""
    memory_embedding_api_key: str = ""

    # Origin lock for tunnel protection
    origin_lock_enabled: bool = False
    origin_lock_secret: str = ""  # Shared secret set in tunnel config


settings = Settings()
