# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

OmniAI (OmniPlexity) is a ChatGPT-style AI WebUI with a security-first architecture:
- **Frontend**: Static SPA on GitHub Pages (https://omniplexity.github.io)
- **Backend**: FastAPI server (127.0.0.1:8787) with tunnel exposure for remote access
- **Providers**: LM Studio, Ollama, OpenAI-compatible endpoints

## Build & Run Commands

```bash
# Backend setup (from repo root)
python -m venv .venv
.venv\Scripts\activate          # Windows
source .venv/bin/activate       # macOS/Linux
pip install -r backend/requirements.txt

# Database migrations
alembic -c backend/alembic.ini upgrade head

# Run backend (dev mode with auto-reload)
python backend/devserver.py

# Run backend (production)
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8787

# Frontend local test
cd frontend
npm install
npm run dev

# Tests
pytest

# Linting
ruff check backend/
ruff format backend/
```

## Architecture

```
GitHub Pages (Static SPA)
    ↓ HTTPS + CORS allowlist
Local FastAPI Backend (127.0.0.1:8787)
  - Session auth (HttpOnly cookies, CSRF)
  - Chat API (SSE streaming, cancel, retry)
  - Provider registry
  - SQLite persistence + audit logs
  - Origin lock middleware (tunnel protection)
    ↓
LM Studio / Ollama / OpenAI-compatible
```

### Backend Layers (`backend/app/`)
- `api/` - Route handlers (admin, auth, chat, conversations, messages, health, providers)
- `auth/` - Sessions, CSRF, audit logging, password hashing (Argon2id)
- `db/` - SQLAlchemy models, Alembic migrations, repository pattern
- `providers/` - Abstract interface + implementations (base.py defines the contract)
- `services/` - Chat orchestration, generation manager
- `config/settings.py` - Pydantic settings (loads .env)

### Frontend (`frontend/`)
- Vite + React + TypeScript (entry: `src/main.tsx`)
- Runtime config loaded from `public/runtime-config.json`
- UI shell and streaming logic live in `src/app/`

## Critical Constraints

1. **Frontend has NO secrets** - All LLM traffic through backend
2. **Backend binds 127.0.0.1** - External access only via tunnel
3. **Strict CORS allowlist** - Only https://omniplexity.github.io
4. **Session cookies** - HttpOnly, Secure, SameSite configured for cross-site
5. **CSRF required** - All state-changing endpoints
6. **Origin lock** - Tunnel injects X-Origin-Secret header
7. **No stack traces to clients** - Normalize to stable error codes

## Provider Interface

All providers in `backend/app/providers/` must implement:
```python
list_models() -> list[ModelInfo]
chat_stream(request) -> AsyncIterator[StreamEvent]
chat_once(request) -> ChatResponse
healthcheck() -> ProviderHealth
capabilities() -> ProviderCapabilities
```

## Database

SQLite at `data/omniplexity.db`. Key tables: users, sessions, invites, conversations, messages, audit_log.

Create migrations: `alembic -c backend/alembic.ini revision --autogenerate -m "description"`

## Deployment

- **Cloudflare Tunnel** (preferred): See `deploy/cloudflared/`
- **Docker + ngrok**: See `deploy/docker/`
- Backend .env must set: `COOKIE_SECURE=true`, `COOKIE_SAMESITE=None`, `ORIGIN_LOCK_SECRET`

## Key Documentation

- `AGENTS.md` - Single source of truth for agent behavior, phased delivery, coding standards
- `docs/runbook.md` - Operations guide
- `docs/dev.md` - Development setup
