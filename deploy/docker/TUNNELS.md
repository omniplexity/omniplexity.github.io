# Tunnels (Cloudflare + ngrok)

This document covers how to expose the Docker backend as a public HTTPS origin that GitHub Pages can call.

## Cloudflare Tunnel (recommended)

Use a **named Cloudflare Tunnel** created in Zero Trust. Quick Tunnels (trycloudflare) do **not** support SSE streaming.

### Steps

1) Create a named tunnel in Cloudflare Zero Trust.
2) Add a public hostname (example: `api.omniplexity.yourdomain`).
3) Set the service/ingress URL to `http://api:8000`.
4) Copy the tunnel token.
5) In `deploy/docker/.env`, set:

```
CLOUDFLARE_TUNNEL_TOKEN=your_token_here
```

6) Start the tunnel profile:

```
docker compose --profile tunnel up -d --build
```

### Notes

- Cloudflare Tunnel supports SSE when configured as a **named tunnel**.
- Verify `/health` from the public hostname.

## ngrok (fallback)

Use ngrok if Cloudflare is not available. This is a fallback and requires a paid or free ngrok authtoken.

### Steps

1) Copy the example config:

```
cp deploy/docker/ngrok.yml.example deploy/docker/ngrok.yml
```

2) Edit `deploy/docker/ngrok.yml` and set your authtoken.
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

- **SSE not streaming**: confirm you are not using trycloudflare/quick tunnel. Named Cloudflare tunnels are required for SSE.
- **Proxy buffering**: some reverse proxies buffer SSE. Ensure your tunnel is configured for streaming.
- **WebSockets** (optional): Cloudflare Tunnel supports WS in most cases; ensure the hostname/ingress is correct.
- **CORS errors**: confirm `https://omniplexity.github.io` is in `CORS_ORIGINS`.
