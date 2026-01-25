# Tunnels (ngrok)

This document covers how to expose the Docker backend as a public HTTPS origin that GitHub Pages can call.

## ngrok

Use ngrok to expose the Docker backend as a public HTTPS origin that GitHub Pages can call.

### Steps

1) Copy the example config:

```
cp deploy/docker/ngrok.yml.example deploy/docker/ngrok.yml
```

2) Edit `deploy/docker/ngrok.yml` and set your authtoken + `X-Origin-Secret` header
   (must match `ORIGIN_LOCK_SECRET` in `.env`).
3) Start the ngrok profile:

```
docker compose --profile ngrok up -d --build
```

4) Check logs for the public HTTPS URL:

```
docker compose logs -f ngrok
```

5) Verify `/health` via the public URL.

## Troubleshooting

- **SSE not streaming**: ensure ngrok is not buffering and the backend is reachable.
- **Proxy buffering**: some reverse proxies buffer SSE. Ensure your tunnel is configured for streaming.
- **CORS errors**: confirm `https://omniplexity.github.io` is in `CORS_ORIGINS`.
