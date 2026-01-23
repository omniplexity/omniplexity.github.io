from __future__ import annotations

import hashlib
import logging
import math
import re
from dataclasses import dataclass
from typing import Any, Dict, List, Optional

import chromadb
from chromadb.config import Settings as ChromaSettings

from backend.app.config.settings import settings

logger = logging.getLogger("backend")


@dataclass
class MemoryMatch:
    id: str
    content: str
    score: Optional[float]


class HashEmbeddingFunction:
    """Lightweight embedding function for offline/dev usage."""

    def __init__(self, dim: int = 384):
        self.dim = dim

    def __call__(self, input: List[str]) -> List[List[float]]:  # Chroma expects parameter name "input"
        if isinstance(input, str):
            input = [input]
        return [self._embed(text) for text in input]

    def _embed(self, text: str) -> List[float]:
        vec = [0.0] * self.dim
        tokens = re.findall(r"[A-Za-z0-9']+", text.lower())
        for token in tokens:
            h = hashlib.sha256(token.encode("utf-8")).digest()
            idx = int.from_bytes(h[:4], "little") % self.dim
            vec[idx] += 1.0
        norm = math.sqrt(sum(v * v for v in vec))
        if norm > 0:
            vec = [v / norm for v in vec]
        return vec

    def embed_query(self, input: List[str]) -> List[List[float]]:
        return self.__call__(input)

    def embed_documents(self, input: List[str]) -> List[List[float]]:
        return self.__call__(input)

    @staticmethod
    def name() -> str:
        return "hash"

    @staticmethod
    def build_from_config(config: Dict[str, Any]) -> "HashEmbeddingFunction":
        return HashEmbeddingFunction(dim=int(config.get("dim", 384)))

    def get_config(self) -> Dict[str, Any]:
        return {"dim": self.dim}

    def supported_spaces(self) -> List[str]:
        return ["cosine"]

    def is_legacy(self) -> bool:
        return False


class OpenAICompatEmbeddingFunction:
    """Embedding function for OpenAI-compatible /embeddings endpoints."""

    def __init__(self, base_url: str, api_key: str, model: str, timeout_seconds: int = 30):
        import httpx

        self.base_url = base_url
        self.api_key = api_key
        self.model = model
        self.timeout_seconds = timeout_seconds
        self._client = httpx.Client(timeout=self.timeout_seconds)

    def __call__(self, input: List[str]) -> List[List[float]]:  # Chroma expects parameter name "input"
        if isinstance(input, str):
            input = [input]
        headers: Dict[str, str] = {}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"

        url = _build_embeddings_url(self.base_url)
        payload = {"model": self.model, "input": input}
        response = self._client.post(url, json=payload, headers=headers)
        response.raise_for_status()
        data = response.json().get("data", [])
        data_sorted = sorted(data, key=lambda item: item.get("index", 0))
        return [item["embedding"] for item in data_sorted]

    def embed_query(self, input: List[str]) -> List[List[float]]:
        return self.__call__(input)

    def embed_documents(self, input: List[str]) -> List[List[float]]:
        return self.__call__(input)

    @staticmethod
    def name() -> str:
        return "openai_compat"

    @staticmethod
    def build_from_config(config: Dict[str, Any]) -> "OpenAICompatEmbeddingFunction":
        return OpenAICompatEmbeddingFunction(
            base_url=config.get("base_url", settings.memory_embedding_base_url),
            api_key=settings.memory_embedding_api_key,
            model=config.get("model", settings.memory_embedding_model),
        )

    def get_config(self) -> Dict[str, Any]:
        return {"model": self.model, "base_url": self.base_url}

    def supported_spaces(self) -> List[str]:
        return ["cosine"]

    def is_legacy(self) -> bool:
        return False


def _build_embeddings_url(base_url: str) -> str:
    base = base_url.rstrip("/")
    if base.endswith("/v1/embeddings"):
        return base
    if base.endswith("/v1"):
        return f"{base}/embeddings"
    return f"{base}/v1/embeddings"


def _get_embedding_function():
    backend = settings.memory_embedding_backend.lower()
    if backend == "auto":
        if settings.memory_embedding_base_url:
            backend = "openai_compat"
        else:
            backend = "hash"

    if backend == "openai_compat":
        if not settings.memory_embedding_base_url:
            logger.warning("Memory embedding base URL not set; falling back to hash embeddings.")
            return HashEmbeddingFunction()
        return OpenAICompatEmbeddingFunction(
            base_url=settings.memory_embedding_base_url,
            api_key=settings.memory_embedding_api_key,
            model=settings.memory_embedding_model,
        )

    if backend == "hash":
        return HashEmbeddingFunction()

    logger.warning("Unknown memory embedding backend '%s'; falling back to hash.", backend)
    return HashEmbeddingFunction()


class MemoryStore:
    def __init__(self, path: str, collection_name: str):
        from pathlib import Path

        Path(path).mkdir(parents=True, exist_ok=True)
        self.path = path
        self.collection_name = collection_name
        self._client = chromadb.PersistentClient(
            path=path,
            settings=ChromaSettings(anonymized_telemetry=False),
        )
        self._collection = self._client.get_or_create_collection(
            name=collection_name,
            embedding_function=_get_embedding_function(),
            metadata={"hnsw:space": "cosine"},
        )

    def upsert(self, memory_id: str, content: str, metadata: Dict[str, Any]) -> None:
        self._collection.upsert(
            ids=[memory_id],
            documents=[content],
            metadatas=[metadata],
        )

    def delete(self, memory_ids: List[str]) -> None:
        if memory_ids:
            self._collection.delete(ids=memory_ids)

    def query(self, user_id: int, query_text: str, limit: int) -> List[MemoryMatch]:
        result = self._collection.query(
            query_texts=[query_text],
            n_results=limit,
            where={"user_id": user_id},
            include=["documents", "distances", "metadatas"],
        )
        ids = result.get("ids", [[]])[0]
        docs = result.get("documents", [[]])[0]
        distances = result.get("distances", [[]])[0]
        matches: List[MemoryMatch] = []
        for idx, mem_id in enumerate(ids):
            content = docs[idx] if idx < len(docs) else ""
            distance = distances[idx] if idx < len(distances) else None
            score = None
            if distance is not None:
                score = max(0.0, 1.0 - float(distance))
            matches.append(MemoryMatch(id=mem_id, content=content, score=score))
        return matches


def get_memory_store() -> Optional[MemoryStore]:
    if not settings.memory_enabled:
        return None
    if not hasattr(get_memory_store, "_cache"):
        get_memory_store._cache = {}
    key = (
        settings.memory_chroma_path,
        settings.memory_collection,
        settings.memory_embedding_backend,
        settings.memory_embedding_model,
        settings.memory_embedding_base_url,
        settings.memory_embedding_api_key,
    )
    if key not in get_memory_store._cache:
        get_memory_store._cache[key] = MemoryStore(
            path=settings.memory_chroma_path,
            collection_name=settings.memory_collection,
        )
    return get_memory_store._cache[key]


def reset_memory_store_for_tests() -> None:
    if hasattr(get_memory_store, "_cache"):
        get_memory_store._cache.clear()
