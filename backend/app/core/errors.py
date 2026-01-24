"""Shared error helpers."""
from dataclasses import dataclass


@dataclass
class APIError(Exception):
    code: str
    message: str
    detail: dict | None = None

