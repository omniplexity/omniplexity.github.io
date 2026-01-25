# OmniAI Runbook (Phase 0)

## Local Development

### Backend

- Create a virtual environment and install dependencies.
- Start the FastAPI dev server.
- Default auth mode is `AUTH_MODE=auto` (bearer-first, session fallback). Override in `.env` if needed.

### Frontend

- Install node dependencies.
- Start the Vite dev server.
- Update `frontend/public/runtime-config.json` to point at your backend (default `http://localhost:8787`).

## Health Checks

- `GET /health` returns status and a request id.
- `GET /version` returns version info (when implemented).
- `POST /chat/stream` should immediately emit a `meta` event when streaming is healthy.

## Smoke Test

- `python scripts/smoke_stream.py --base-url http://127.0.0.1:8787 --username <user> --password <pass>`
- Optional: pass `--bootstrap-token <token>` to create the admin user if one does not exist.

## Troubleshooting

- If the frontend cannot reach the backend, verify tunnel origin settings and CORS allowlist.
- If database locks occur on Windows, ensure SQLite uses DELETE journal mode in tests.
