# Auth (Bearer-First)

OmniAI uses **Bearer JWT** access tokens by default for GitHub Pages deployments to avoid third‑party cookie issues.

## Why bearer for GitHub Pages

GitHub Pages runs on `https://omniplexity.github.io` while your API is hosted on a different hostname. Modern browsers may block third‑party cookies, which makes cookie‑based sessions unreliable. Bearer tokens avoid this.

## Configuration

Set in `.env` (backend container):

```
AUTH_MODE=bearer
JWT_SECRET=change_me
JWT_ACCESS_TTL_SECONDS=900
```

Rotate `JWT_SECRET` periodically. Short access token TTLs are recommended.

## Endpoints

- `POST /auth/login` → `{ access_token, expires_in, refresh_token }`
- `POST /auth/refresh` → new access + refresh token
- `POST /auth/logout` → revoke refresh token (optional)

## HTTPS‑only tokens

Only use bearer tokens over HTTPS. Never embed secrets in frontend code.

## Session mode (local dev)

If you want to keep cookie sessions for local development:

```
AUTH_MODE=session
```

This will enable cookie + CSRF protections (and CORS `allow_credentials`).
