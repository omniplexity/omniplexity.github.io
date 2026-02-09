# OmniAI Frontend

Static GitHub Pages SPA for [omniplexity.github.io](https://omniplexity.github.io).

## Entrypoints

| Page | HTML | Script | Purpose |
|------|------|--------|---------|
| Auth gate | `index.html` | `js/boot.js` | Checks session, redirects to login or chat |
| Login | `login.html` | `js/login.js` | Login/register forms, backend badge |
| Chat | `chat.html` | `js/app.js` | Protected chat UI, admin panel, streaming |

## Rules

- `login.html` never loads chat JS (no state.js, sse.js, ui.js)
- `chat.html` assumes authenticated user (enforceAuth gate)
- `index.html` renders no UI — redirect only
- All backend URLs come from `runtime-config.json` via `config.js`

## JS Modules

| Module | Lines | Role |
|--------|-------|------|
| `config.js` | 38 | Loads runtime-config.json, exports apiBaseUrl() |
| `auth.js` | 104 | login(), register(), logout(), CSRF token management |
| `api.js` | 134 | Fetch wrappers with CSRF + auth error handling |
| `login.js` | 157 | Login page entry point (forms, notices, badge) |
| `boot.js` | 24 | Auth gate — checks /api/auth/me, redirects |
| `app.js` | 917 | Chat orchestration, admin panel, event handlers |
| `sse.js` | 434 | SSE streaming with reconnection + polling fallback |
| `state.js` | 490 | Global state (conversations, messages, admin) |
| `ui.js` | 1241 | DOM rendering (49 exported functions) |

## Configuration

Edit `runtime-config.json` to point to a different backend:

```json
{"BACKEND_BASE_URL": "https://your-tunnel-domain.trycloudflare.com"}
```

## Deployment

Push to `main` and GitHub Pages auto-deploys. Force cache bust:

```bash
git commit --allow-empty -m "chore: force pages redeploy"
git push origin main
```

Then clear browser site data (DevTools → Application → Storage).
