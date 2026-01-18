from __future__ import annotations

import contextvars
import json
import logging
from datetime import datetime, timezone
from typing import Any


request_id_var: contextvars.ContextVar[str | None] = contextvars.ContextVar("request_id", default=None)


class JSONFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        # request_id from record.extra OR from contextvar
        req_id = getattr(record, "request_id", None) or request_id_var.get()

        payload: dict[str, Any] = {
            "ts": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "msg": record.getMessage(),
            "logger": record.name,
            "module": record.module,
            "func": record.funcName,
            "line": record.lineno,
        }
        if req_id:
            payload["request_id"] = req_id

        if record.exc_info:
            payload["exc_info"] = self.formatException(record.exc_info)

        return json.dumps(payload, ensure_ascii=False)


def setup_logging(level: str = "INFO") -> None:
    root = logging.getLogger()

    # Reload-safe: replace handlers instead of accumulating them.
    for h in list(root.handlers):
        root.removeHandler(h)

    handler = logging.StreamHandler()
    handler.setFormatter(JSONFormatter())
    root.addHandler(handler)
    root.setLevel(getattr(logging, level.upper(), logging.INFO))