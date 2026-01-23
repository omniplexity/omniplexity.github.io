from __future__ import annotations

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from backend.app.auth.csrf import require_csrf
from backend.app.auth.deps import require_active_user
from backend.app.db.models import User
from backend.app.db.session import get_db
from backend.app.services.memory_service import (
    create_memory_item,
    delete_memory_item,
    list_memory_items,
    search_memory,
)


class CreateMemoryRequest(BaseModel):
    content: str = Field(..., min_length=1)
    memory_type: Optional[str] = None
    tags: Optional[List[str]] = None
    conversation_id: Optional[int] = None

    model_config = {
        "json_schema_extra": {
            "examples": [
                {"content": "My name is Sam.", "memory_type": "identity", "tags": ["profile"]},
            ]
        }
    }


router = APIRouter(prefix="/memory", tags=["memory"])


@router.get("")
def list_or_search_memory(
    q: Optional[str] = None,
    limit: int = Query(20, ge=1, le=100),
    include_auto: bool = False,
    user: User = Depends(require_active_user),
    db: Session = Depends(get_db),
) -> List[dict]:
    if q:
        return search_memory(db, user.id, q, limit=limit)

    items = list_memory_items(db, user.id, limit=limit, include_auto=include_auto)
    return [
        {
            "id": item.id,
            "content": item.content,
            "memory_type": item.memory_type,
            "source": item.source,
            "tags": item.tags,
            "conversation_id": item.conversation_id,
            "is_auto": item.is_auto,
            "created_at": item.created_at.isoformat(),
            "updated_at": item.updated_at.isoformat(),
        }
        for item in items
    ]


@router.post("", dependencies=[Depends(require_csrf)])
def create_memory(
    req: CreateMemoryRequest,
    user: User = Depends(require_active_user),
    db: Session = Depends(get_db),
) -> dict:
    content = req.content.strip()
    if not content:
        raise HTTPException(status_code=400, detail={"code": "MEMORY_INVALID", "message": "Content cannot be empty"})

    item = create_memory_item(
        db=db,
        user_id=user.id,
        content=content,
        memory_type=req.memory_type or "note",
        tags=req.tags,
        conversation_id=req.conversation_id,
        source="user",
        is_auto=False,
    )
    db.commit()
    db.refresh(item)
    return {
        "id": item.id,
        "content": item.content,
        "memory_type": item.memory_type,
        "source": item.source,
        "tags": item.tags,
        "conversation_id": item.conversation_id,
        "is_auto": item.is_auto,
        "created_at": item.created_at.isoformat(),
        "updated_at": item.updated_at.isoformat(),
    }


@router.delete("/{memory_id}", dependencies=[Depends(require_csrf)])
def delete_memory(
    memory_id: str,
    user: User = Depends(require_active_user),
    db: Session = Depends(get_db),
) -> dict:
    deleted = delete_memory_item(db, user.id, memory_id)
    if not deleted:
        raise HTTPException(status_code=404, detail={"code": "MEMORY_NOT_FOUND", "message": "Memory item not found"})
    db.commit()
    return {"message": "Memory item deleted"}
