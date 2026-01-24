# OmniAI Runbook (Phase 0)

## Local Development

### Backend

- Create a virtual environment and install dependencies.
- Start the FastAPI dev server.

### Frontend

- Install node dependencies.
- Start the Vite dev server.

## Health Checks

- `GET /health` returns status and a request id.
- `GET /version` returns version info (when implemented).
- `POST /chat/stream` should immediately emit a `meta` event when streaming is healthy.

## Troubleshooting

- If the frontend cannot reach the backend, verify tunnel origin settings and CORS allowlist.
- If database locks occur on Windows, ensure SQLite uses DELETE journal mode in tests.
