from __future__ import annotations

import logging
import uuid
from urllib.parse import unquote

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from backend.app.api.admin import router as admin_router
from backend.app.api.chat import router as chat_router
from backend.app.api.conversations import router as conversations_router
from backend.app.api.health import router as health_router
from backend.app.api.messages import router as messages_router
from backend.app.api.providers import router as providers_router
from backend.app.auth.routes import router as auth_router
from backend.app.config.settings import settings
from backend.app.observability.logging import request_id_var, setup_logging
from backend.app.providers.registry import registry
from backend.app.security.cors import cors_kwargs

setup_logging(level=settings.log_level)
logger = logging.getLogger("backend")

app = FastAPI(title="OmniPlexity Backend", version="0.1.0")


@app.on_event("startup")
def startup_event():
    """Build provider registry on startup."""
    registry.build_registry()

app.add_middleware(CORSMiddleware, **cors_kwargs(settings.cors_origins))


class OriginLockMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if not settings.origin_lock_enabled:
            return await call_next(request)

        # Test-only hook: use X-Test-Client-IP header if present and in test environment
        client_host = request.client.host if request.client else None
        if settings.environment == "test" and "X-Test-Client-IP" in request.headers:
            client_host = request.headers["X-Test-Client-IP"]

        # Allow localhost
        if client_host in ("127.0.0.1", "localhost", "::1"):
            return await call_next(request)

        # Allow OPTIONS for CORS preflight unconditionally
        if request.method == "OPTIONS":
            return await call_next(request)

        # Allow health and version checks for monitoring (no secret required)
        # Normalize path to prevent encoded variant bypass
        normalized_path = unquote(request.url.path)
        allow_without_secret = {"/health", "/version"}
        if normalized_path in allow_without_secret:
            return await call_next(request)

        # Check for tunnel header
        tunnel_secret = request.headers.get("X-Origin-Secret")
        if tunnel_secret == settings.origin_lock_secret:
            return await call_next(request)

        # Reject
        return JSONResponse(
            status_code=403,
            content={
                "code": "ORIGIN_LOCKED",
                "message": "Access denied: origin not allowed",
                "request_id": getattr(request.state, "request_id", "unknown"),
            },
        )


app.add_middleware(OriginLockMiddleware)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        # Add security headers (safe defaults)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Referrer-Policy"] = "no-referrer"
        return response


app.add_middleware(SecurityHeadersMiddleware)
app.include_router(health_router)
app.include_router(auth_router)
app.include_router(admin_router)
app.include_router(providers_router)
app.include_router(conversations_router)
app.include_router(messages_router)
app.include_router(chat_router)


class RequestIDMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        request_id = str(uuid.uuid4())
        request.state.request_id = request_id

        token = request_id_var.set(request_id)
        try:
            response = await call_next(request)
            response.headers["X-Request-ID"] = request_id
            return response
        finally:
            request_id_var.reset(token)


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        import time
        start_time = time.time()

        response = await call_next(request)

        # Calculate latency
        latency = time.time() - start_time

        # Get route info
        route = getattr(request.scope.get("route"), "path", request.url.path) if hasattr(request.scope, "route") else request.url.path
        method = request.method
        status = response.status_code

        # Log request
        logger.info(
            f"Request completed",
            extra={
                "request_id": getattr(request.state, "request_id", "unknown"),
                "method": method,
                "route": route,
                "status": status,
                "latency_ms": round(latency * 1000, 2),
            }
        )

        return response


app.add_middleware(RequestIDMiddleware)
app.add_middleware(RequestLoggingMiddleware)


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    request_id = getattr(request.state, "request_id", "unknown")
    detail = exc.detail if isinstance(exc.detail, dict) else {"code": "HTTP_ERROR", "message": str(exc.detail)}
    return JSONResponse(
        status_code=exc.status_code,
        content={"code": detail.get("code", "HTTP_ERROR"), "message": detail.get("message", "Request failed"), "request_id": request_id},
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    request_id = getattr(request.state, "request_id", "unknown")
    return JSONResponse(
        status_code=400,
        content={"code": "VALIDATION_ERROR", "message": "Invalid request", "detail": exc.errors(), "request_id": request_id},
    )

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    request_id = getattr(request.state, "request_id", "unknown")
    logger.error("Unhandled exception", extra={"request_id": request_id}, exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "code": "INTERNAL_ERROR",
            "message": "An internal error occurred",
            "request_id": request_id,
        },
    )