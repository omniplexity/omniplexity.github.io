# CORS Allowlist

OmniAI uses a strict CORS allowlist. Configure allowed origins via:

```
CORS_ORIGINS=https://omniplexity.github.io,http://localhost:5173
```

## Defaults

- Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS
- Headers (Bearer mode): Authorization, Content-Type, X-Request-Id
- Headers (Session mode): Authorization, Content-Type, X-Request-Id, X-CSRF-Token
- Exposed headers: X-Request-Id

## Common Issues

- **CORS preflight fails**: ensure your origin is in `CORS_ORIGINS` and headers match.
- **Mixed content**: API hostname must be HTTPS when the frontend is HTTPS.
- **Credentials**: Bearer mode disables credentials; session mode enables credentials.
