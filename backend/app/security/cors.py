from __future__ import annotations


def cors_kwargs(origins: list[str], allow_credentials: bool) -> dict:
    allow_headers = ["Authorization", "Content-Type", "X-Request-Id"]
    if allow_credentials:
        allow_headers.append("X-CSRF-Token")

    return {
        "allow_origins": origins,
        "allow_credentials": allow_credentials,
        "allow_methods": ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        "allow_headers": allow_headers,
        "expose_headers": ["X-Request-Id"],
    }
