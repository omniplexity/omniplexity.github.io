from __future__ import annotations

import logging
import re
import uuid
from typing import List, Optional

from sqlalchemy import func
from sqlalchemy.orm import Session

from backend.app.config.settings import settings
from backend.app.db.models import MemoryItem
from backend.app.services.memory_store import MemoryMatch, get_memory_store

logger = logging.getLogger("backend")

_SENTENCE_SPLIT = re.compile(r"(?<=[.!?])\s+")
_WS_CLEAN = re.compile(r"\s+")

_MEMORY_PATTERNS = [
    ("identity", re.compile(r"\b(my name is|i am|i'm)\b", re.IGNORECASE)),
    ("preference", re.compile(r"\b(i like|i love|i prefer|my favorite|i hate)\b", re.IGNORECASE)),
    ("profile", re.compile(r"\b(i live in|i work at|my job|my role|my company|my email|my phone)\b", re.IGNORECASE)),
    ("goal", re.compile(r"\b(my goal|i want to|i need to)\b", re.IGNORECASE)),
    ("note", re.compile(r"\bremember\b", re.IGNORECASE)),
]


def _clean_text(text: str) -> str:
    return _WS_CLEAN.sub(" ", text.strip())


def _truncate(text: str, max_chars: int) -> str:
    if len(text) <= max_chars:
        return text
    return text[: max_chars - 1].rstrip() + "…"


def extract_memory_candidates(text: str) -> List[tuple[str, str]]:
    """Extract memory-worthy sentences with rough classification."""
    cleaned = _clean_text(text)
    if not cleaned:
        return []
    candidates: List[tuple[str, str]] = []
    for sentence in _SENTENCE_SPLIT.split(cleaned):
        sentence = _clean_text(sentence)
        if len(sentence) < 8:
            continue
        matched_type: Optional[str] = None
        for mem_type, pattern in _MEMORY_PATTERNS:
            if pattern.search(sentence):
                matched_type = mem_type
                break
        if matched_type:
            candidates.append((sentence, matched_type))
    return candidates


def create_memory_item(
    db: Session,
    user_id: int,
    content: str,
    memory_type: str = "note",
    tags: Optional[List[str]] = None,
    conversation_id: Optional[int] = None,
    source: str = "user",
    is_auto: bool = False,
) -> MemoryItem:
    content = _truncate(_clean_text(content), settings.memory_max_chars)
    existing = db.query(MemoryItem).filter(
        MemoryItem.user_id == user_id,
        MemoryItem.content == content,
    ).first()

    if existing:
        if not is_auto:
            existing.memory_type = memory_type
            existing.tags = tags
            existing.conversation_id = conversation_id
            existing.source = source
            existing.is_auto = False
        existing.updated_at = func.now()
        item = existing
    else:
        item = MemoryItem(
            id=str(uuid.uuid4()),
            user_id=user_id,
            conversation_id=conversation_id,
            content=content,
            memory_type=memory_type,
            source=source,
            tags=tags,
            is_auto=is_auto,
        )
        db.add(item)
        db.flush()

    store = get_memory_store()
    if store:
        try:
            store.upsert(
                item.id,
                content,
                {
                    "user_id": user_id,
                    "memory_type": item.memory_type,
                    "source": item.source,
                    "conversation_id": item.conversation_id if item.conversation_id is not None else -1,
                    "is_auto": item.is_auto,
                },
            )
        except Exception:
            logger.warning("Memory upsert failed", extra={"user_id": user_id, "memory_id": item.id})

    return item


def ingest_user_message(
    db: Session,
    user_id: int,
    conversation_id: int,
    content: str,
) -> List[MemoryItem]:
    if not settings.memory_enabled or not settings.memory_auto_ingest_user_messages:
        return []

    candidates = extract_memory_candidates(content)
    if not candidates:
        return []

    items: List[MemoryItem] = []
    for sentence, mem_type in candidates:
        items.append(
            create_memory_item(
                db=db,
                user_id=user_id,
                content=sentence,
                memory_type=mem_type,
                conversation_id=conversation_id,
                source="user",
                is_auto=True,
            )
        )
    return items


def ingest_assistant_message(
    db: Session,
    user_id: int,
    conversation_id: int,
    content: str,
) -> List[MemoryItem]:
    if not settings.memory_enabled or not settings.memory_auto_ingest_assistant_messages:
        return []

    candidates = extract_memory_candidates(content)
    if not candidates:
        return []

    items: List[MemoryItem] = []
    for sentence, mem_type in candidates:
        items.append(
            create_memory_item(
                db=db,
                user_id=user_id,
                content=sentence,
                memory_type=mem_type,
                conversation_id=conversation_id,
                source="assistant",
                is_auto=True,
            )
        )
    return items


def list_memory_items(
    db: Session,
    user_id: int,
    limit: int = 50,
    include_auto: bool = False,
) -> List[MemoryItem]:
    query = db.query(MemoryItem).filter(MemoryItem.user_id == user_id)
    if not include_auto:
        query = query.filter(MemoryItem.is_auto.is_(False))
    return query.order_by(MemoryItem.updated_at.desc()).limit(limit).all()


def delete_memory_item(db: Session, user_id: int, memory_id: str) -> bool:
    item = db.query(MemoryItem).filter(MemoryItem.id == memory_id, MemoryItem.user_id == user_id).first()
    if not item:
        return False
    db.delete(item)

    store = get_memory_store()
    if store:
        try:
            store.delete([memory_id])
        except Exception:
            logger.warning("Memory delete failed", extra={"user_id": user_id, "memory_id": memory_id})
    return True


def search_memory(
    db: Session,
    user_id: int,
    query: str,
    limit: int = 6,
) -> List[dict]:
    store = get_memory_store()
    if not store:
        return []

    matches: List[MemoryMatch] = []
    try:
        matches = store.query(user_id=user_id, query_text=query, limit=limit)
    except Exception:
        logger.warning("Memory query failed", extra={"user_id": user_id})
        return []

    # Filter by score
    filtered = [
        match for match in matches
        if match.score is None or match.score >= settings.memory_min_score
    ]

    ids = [m.id for m in filtered]
    if ids:
        db.query(MemoryItem).filter(MemoryItem.id.in_(ids), MemoryItem.user_id == user_id).update(
            {"last_accessed_at": func.now()}, synchronize_session=False
        )

    items = db.query(MemoryItem).filter(MemoryItem.id.in_(ids), MemoryItem.user_id == user_id).all()
    item_by_id = {item.id: item for item in items}

    results: List[dict] = []
    for match in filtered:
        item = item_by_id.get(match.id)
        if not item:
            continue
        results.append({
            "id": item.id,
            "content": item.content,
            "memory_type": item.memory_type,
            "source": item.source,
            "tags": item.tags,
            "conversation_id": item.conversation_id,
            "is_auto": item.is_auto,
            "created_at": item.created_at.isoformat(),
            "updated_at": item.updated_at.isoformat(),
            "score": match.score,
        })
    return results


def build_memory_prompt(db: Session, user_id: int, query: str, limit: int) -> str:
    results = search_memory(db, user_id, query, limit=limit)
    if not results:
        return ""
    lines = []
    for item in results:
        content = _truncate(item["content"], settings.memory_max_chars)
        lines.append(f"- {content}")
    memory_block = "\n".join(lines)
    return (
        "Relevant user memory (may be incomplete; use only if helpful):\n"
        f"{memory_block}"
    )
