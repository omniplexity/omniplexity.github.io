# Chat Streaming Protocol

OmniAI streams chat responses over **Server-Sent Events (SSE)**.

## Endpoint

- `POST /chat/stream`

## Request Shape

```json
{
  "conversation_id": 123,
  "project_id": 456,
  "message": { "role": "user", "content": "Hello" },
  "provider": "lmstudio",
  "model": "llama-3.2-3b-instruct",
  "temperature": 0.7,
  "top_p": 1,
  "max_tokens": 1024
}
```

All fields are optional **except** `message`. If `conversation_id` is missing or invalid, the backend creates a new conversation automatically.

## Event Order

The **first** event is always `meta`.

### `meta`
Contains the resolved conversation and model selection.

```json
{
  "conversation_id": 123,
  "project_id": 456,
  "provider": "lmstudio",
  "model": "llama-3.2-3b-instruct",
  "generation_id": "uuid"
}
```

### `delta`
Incremental text updates.

```json
{ "delta": "Hello", "text": "Hello", "generation_id": "uuid" }
```

### `usage`
Token usage if the provider reports it.

```json
{ "usage": { "prompt_tokens": 10, "completion_tokens": 5, "total_tokens": 15 }, "generation_id": "uuid" }
```

### `done`
Terminal event for the stream.

```json
{ "status": "ok", "elapsed_ms": 1234, "usage": { "total_tokens": 15 }, "generation_id": "uuid" }
```

### `error`
Structured error event (stream remains valid; a `done` event follows).

```json
{ "code": "no_models_available", "message": "No models are available", "generation_id": "uuid" }
```

## Headers

The backend sets:

- `Content-Type: text/event-stream`
- `Cache-Control: no-cache`
- `Connection: keep-alive`
- `X-Accel-Buffering: no`
