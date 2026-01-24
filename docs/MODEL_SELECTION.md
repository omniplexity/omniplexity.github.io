# Model Selection

Model/provider selection is **backend‑enforced** and deterministic. It guarantees a valid provider/model or returns a structured error.

## Priority Rules

Selection uses the following order:

1. **Explicit request** (`provider` + `model`): validate; if invalid → `invalid_model`.
2. **Conversation pinned** (`conversation.provider` + `conversation.model`): validate; if invalid → fall through.
3. **Project defaults** (`project.default_provider` + `project.default_model`): validate; if invalid → fall through.
4. **User defaults** (`user.default_provider` + `user.default_model`): validate; if invalid → fall through.
5. **Env defaults** (`DEFAULT_PROVIDER` + `DEFAULT_MODEL`): validate; if invalid → fall through.
6. **Provider priority scan**: first provider with any models; choose a model by `MODEL_PRIORITY` substring match, else first model.

If no models are available, the stream emits `error` with code `no_models_available`.

## Environment Variables

```bash
DEFAULT_PROVIDER=
DEFAULT_MODEL=
PROVIDER_PRIORITY=lm_studio,ollama,openai_compat
MODEL_PRIORITY=qwen,deepseek,llama,gpt
```

### Provider Aliases

The backend normalizes common aliases:

- `lm_studio` → `lmstudio`
- `openai_compat` → `openai`

## Notes

- The backend pins the chosen provider/model on first use if the conversation has none.
- If a pinned/default model is no longer available, selection falls back to rule (6).
