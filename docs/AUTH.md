# Auth (Auto: Bearer + Session)

OmniAI supports both **Bearer JWT** access tokens and **session cookies**. The default mode is `AUTH_MODE=auto`, which:

- Uses Bearer tokens when the `Authorization: Bearer ...` header is present.
- Falls back to session cookies when no bearer token is provided.
- Enforces CSRF only for session-authenticated, state-changing requests.

## Why bearer for GitHub Pages

GitHub Pages runs on `https://omniplexity.github.io` while your API is hosted on a different hostname. Modern browsers may block third‑party cookies, which makes cookie‑based sessions unreliable. Bearer tokens avoid this.

## Configuration

Set in `.env` (backend container):

```
AUTH_MODE=auto
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

## Session-only mode (optional)

If you want to keep cookie sessions for local development:

```
AUTH_MODE=session
```

This will enable cookie + CSRF protections (and CORS `allow_credentials`).

## Bearer-only mode (optional)

If you want to require bearer tokens only:

```
AUTH_MODE=bearer
```
