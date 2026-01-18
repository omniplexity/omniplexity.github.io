from __future__ import annotations


def cors_kwargs(origins: list[str]) -> dict:
    return {
        "allow_origins": origins,
        "allow_credentials": True,
        "allow_methods": ["*"],
        "allow_headers": ["*"],
    }