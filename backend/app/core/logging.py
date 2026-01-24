"""Core logging utilities facade."""
from backend.app.observability.logging import request_id_var, setup_logging

__all__ = ["request_id_var", "setup_logging"]
