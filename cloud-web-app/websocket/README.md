# Aethel WebSocket Service

Dedicated runtime container for `C:\Users\Grosarik\Desktop\Aethel engine\meu-repo\cloud-web-app\web\server\websocket-server.ts`.

## Endpoints

- `GET /health`
- `GET /stats`
- `GET /metrics`
- `WS /collaboration/:room`
- `WS /terminal/:id`
- `WS /lsp/:language`
- `WS /ai`
- `WS /dap`

## Build

Run from the repository root:

```bash
docker build -f cloud-web-app/websocket/Dockerfile -t aethel-websocket .
```

## Run

```bash
docker run --rm -p 3001:3001 \
  -e REDIS_URL=redis://host.docker.internal:6379 \
  aethel-websocket
```
