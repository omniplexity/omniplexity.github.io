"""Core rate limiting interfaces."""

class RateLimitExceeded(Exception):
    """Raised when a rate limit is exceeded."""


def check_rate_limit(*_args, **_kwargs) -> None:
    """Placeholder rate limit hook (implemented in later phases)."""
    return None
