"""Pydantic schema placeholders for domain layer."""
from pydantic import BaseModel


class HealthResponse(BaseModel):
    status: str
    request_id: str | None = None
