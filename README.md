# OmniPlexity Local AI WebUI

A production-grade ChatGPT-like WebUI:
- **Frontend**: static SPA on GitHub Pages (`https://omniplexity.github.io`)
- **Backend**: local FastAPI server (binds `127.0.0.1`), securely exposed via tunnel for **invite-only** users
- **Providers**: LM Studio (OpenAI-compatible), Ollama, generic OpenAI-compatible endpoints
- **UX**: SSE streaming, cancel, retry, conversation history, model/settings controls
- **Persistence**: SQLite by default (upgradeable)

## Non-Negotiables
- Frontend is **static-only**: no secrets, no provider calls, no direct LLM access
- All provider calls go through backend **only**
- Backend enforces:
  - session-cookie auth (HttpOnly + Secure)
  - CSRF protection for state-changing endpoints
  - strict CORS allowlist (`https://omniplexity.github.io`)
  - rate limiting + audit logs
- Default backend bind: **127.0.0.1** (external access only via tunnel/reverse proxy)

## Architecture (high level)

