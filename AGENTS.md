AGENTS.md — OmniAI WebUI (Cline + grok-code-fast-1)

This file is the single source of truth for how agents work in this repo.
Optimize for correctness, security, streaming UX, and maintainability.
Assume development via VS Code + Cline using model grok-code-fast-1.

0) Project Charter
Mission

Build a production-grade AI WebUI where:

Frontend: static SPA deployed on GitHub Pages (https://omniplexity.github.io)

Backend: runs locally on the owner machine; securely exposes API to invite-only users

Backend proxies to:

LM Studio (OpenAI-compatible)

Ollama

Any OpenAI-compatible endpoint

UX parity targets:

Streaming (SSE), Cancel, Retry, History, Model/settings controls

Stable persistence (SQLite by default)

Definition of Done

Users can log in on GitHub Pages → chat with streaming → cancel/retry → resume history.

Admin can invite/disable users and view audit logs.

Remote access is TLS-protected (via tunnel), invite-gated, rate-limited, persistent, observable.

1) Non-Negotiable Constraints (Hard Rules)
Frontend

GitHub Pages is static-only: no secrets and no server-side logic.

Frontend must never call provider endpoints directly (LM Studio/Ollama/OpenAI).
All LLM traffic must go through the backend.

Backend

All secrets stay backend-only (.env, never committed).

Default bind: 127.0.0.1. External access only via tunnel/reverse proxy.

Strict CORS allowlist: only https://omniplexity.github.io (plus optional custom domain).

Protect remote access with:

TLS

Auth

Rate limiting

Audit logs

Invite gating / allowlist

Never leak stack traces to clients. Normalize errors to stable error codes.

2) Repo Structure (Clean Boundaries)

Target structure:

frontend/                 # static SPA source (no secrets)
backend/                  # FastAPI server
  app/
    api/                  # routers
    auth/                 # users, sessions, invites, csrf
    config/               # settings, env, feature flags
    db/                   # models, migrations, repo layer
    providers/            # LM Studio, Ollama, OpenAI-compat
    services/             # chat orchestration, streaming, cancel, rate limit
    observability/        # logging, metrics hooks
    security/             # headers, origin lock, csrf helpers
    utils/
  tests/
contracts/                # OpenAPI + JSON schemas (versioned)
deploy/                   # ngrok configs, run scripts
docs/                     # threat model, runbook, architecture notes


Rules:

No cross-layer imports that violate boundaries (e.g., UI code importing DB).

Shared request/response models live in contracts/ (or backend app/contracts/) and get versioned.

3) Phased Delivery Plan (Strict Order)

Each phase must end runnable + tested.

Backend skeleton

config, /health, /version, OpenAPI, structured logging

DB layer

SQLite, migrations, models

Auth

invites, users, sessions, CSRF, admin bootstrap

Provider registry

LM Studio + Ollama + generic OpenAI-compat

Chat API

conversations/messages + SSE streaming, cancel, retry

Frontend

login + session handling + chat UI with streaming + sidebar

Admin

manage users/invites/quotas, audit log viewer

Deploy

tunnel configs, origin lock, runbook

Agent rule: do not skip phases unless the repo already contains completed phases and tests prove it.

4) Backend Technical Standards
Stack

Python 3.12+

FastAPI + Uvicorn

Pydantic Settings for config

SQLite default; design DB layer to be Postgres-upgradeable

Alembic migrations (preferred) or a lightweight migration runner (if already implemented)

Security

Password hashing: Argon2id (preferred) or bcrypt.

Auth mechanism: session cookies

HttpOnly, Secure, SameSite=Strict/Lax (choose based on tunnel/domain behavior)

CSRF protection on state-changing endpoints.

Rate limiting per-IP and per-user (+ quotas per day/tokens if available).

Request size limits; safe file upload limits if/when uploads exist.

CORS allowlist only.

“Origin lock” option: only allow tunnel-originated traffic externally.

Error Model (Stable Codes)

All API errors must normalize into:

code: stable string (e.g., AUTH_INVALID, RATE_LIMITED, PROVIDER_TIMEOUT)

message: user-safe

detail: optional, non-sensitive

request_id: correlation id

No stack traces to clients.

Observability

JSON logs

Request id middleware

Audit log table for security-relevant actions

/health should validate DB + provider reachability (best-effort, timeboxed)

5) Provider Abstraction (Non-negotiable Interface)

All providers implement:

list_models() -> list[ModelInfo]

chat_stream(request) -> AsyncIterator[StreamEvent] (SSE adapter consumes this)

chat_once(request) -> ChatResponse

healthcheck() -> ProviderHealth

capabilities() -> ProviderCapabilities

Notes:

Add a provider registry that routes by provider_id.

Providers must support timeouts, retries (bounded), and cancellation hooks where possible.

Token accounting:

capture prompt/completion/total if provider returns it

include in persisted message metadata

6) Chat Streaming (SSE) Requirements
Transport

Backend → Frontend: SSE

Stream begins quickly (first chunk ASAP)

Supports:

incremental text deltas

final “done” event

structured error event

Cancel

Cancel must stop generation promptly:

best-effort cancel request to provider

server should stop emitting and close stream

Backend must maintain a cancel token per active stream:

keyed by conversation_id + message_id or stream_id

Retry

Retry resubmits the last user message with identical settings unless overridden.

7) Persistence & Data Model (Minimum Tables)

Minimum schema:

users(id, username/email, password_hash, role, status, created_at, last_login)

sessions(id, user_id, expires_at, device_meta)

invites(code, created_by, used_by, expires_at, created_at)

conversations(id, user_id, title, created_at, updated_at)

messages(id, conversation_id, role, content, provider_meta, token_usage, created_at)

audit_log(id, actor_user_id, action, target, ip, user_agent, created_at)

Rules:

Every state-changing auth/admin action writes an audit log record.

Conversations and messages are always scoped to user unless admin.

8) Frontend Requirements (Static SPA)
Core UX

Login page (session cookie-based)

Chat UI:

threads sidebar (list/search/rename/delete)

markdown rendering + code copy

streaming transcript rendering (incremental updates, no O(n²))

controls: model dropdown, temperature/top_p/max_tokens, stop/cancel, retry

status line: model, elapsed time, token usage when available

Reliability

SSE reconnect with backoff

Clean offline/endpoint-unreachable UX

No secrets in frontend. No provider URLs. Only backend base URL.

Accessibility

Keyboard-first navigation

ARIA labels on controls

Visible focus states

9) Deployment & Exposure

Supported modes:

ngrok (required)

Backend rules:

still binds 127.0.0.1

allow external only via tunnel ingress

enforce origin lock if enabled

Docs required in deploy/ and docs/:

setup steps

environment variables (.env.example)

runbook: start/stop/upgrade/backup/restore

threat model summary

10) Coding Conventions & Quality Gates
General

No monoliths: prefer small modules with explicit interfaces.

No silent failures: errors must be actionable and logged safely.

Keep client-visible output stable; don’t break API schemas casually.

Backend

ruff + black (or repo standard)

pytest for unit/integration tests

Add tests for:

auth flows

SSE streaming happy path

cancel

rate limit

provider error normalization

Frontend

Keep build static and reproducible

Avoid huge dependencies unless justified

Basic e2e smoke test optional (Playwright) if feasible

11) Cline Operating Procedure (Mandatory)

When using Cline for changes, the agent must follow this workflow every time:

Step A — Scope & Plan (brief, concrete)

Identify phase and the smallest deliverable.

List files to touch.

List commands to run.

Step B — Inspect

Read existing files before editing.

Identify current patterns and match them.

Step C — Implement (minimal diffs)

Implement in small commits (logical chunks).

Keep changes bounded to the phase goal.

Step D — Verify

Run formatting/lint/tests.

Provide run commands (Windows + cross-platform if relevant).

Step E — Report (always)

Updated file tree (only relevant paths)

Patch-style diffs or full file contents for new files

How to run / how to test

Known limitations + follow-ups

Never:

introduce secrets into frontend or commit .env

bypass auth to reach providers

remove security controls for convenience

12) grok-code-fast-1 Optimization Rules (Agent Output Discipline)

To maximize performance and accuracy with grok-code-fast-1:

Prefer explicit file paths and copy/paste-ready outputs.

Use minimal diffs when editing existing files.

Keep plans short; spend tokens on correctness and edge cases.

When unsure, inspect repo state first (don’t guess structure).

Avoid speculative refactors during security/auth phases.

13) Task Templates (Copy/Paste Into Cline)
Template: Implement a Phase Subtask
You are implementing Phase <N>: <name>.
Constraints: GitHub Pages static frontend, backend holds secrets, session-cookie auth, SSE streaming, strict CORS allowlist.
Do:
1) Inspect current repo structure and existing code patterns.
2) Implement <specific subtask> with minimal diffs.
3) Add/update tests.
4) Provide: relevant seen file tree, diffs, and run/test commands.
Do not: add secrets to frontend; bypass backend to providers; leak stack traces to clients.
Model: grok-code-fast-1. Optimize for correctness and maintainability.

Template: Add a Provider
Add provider "<provider_id>" implementing:
list_models, chat_stream, chat_once, healthcheck, capabilities.
Must normalize errors to stable codes, support timeouts, and be cancel-aware best-effort.
Update registry + unit tests.
Provide diffs + test commands.

Template: SSE Streaming Endpoint
Implement SSE endpoint for chat streaming.
Events: delta, usage, done, error.
Support cancel via stream_id.
Persist final assistant message + token usage.
Add integration tests using httpx AsyncClient.
Provide diffs + run/test commands.

14) Edge Cases Checklist (Must Consider)

Cookie + SameSite behavior behind tunnel/custom domain

CORS preflight correctness

CSRF tokens for non-idempotent requests

Rate limiting response shape (include retry-after if available)

Provider timeouts + partial streams

Cancel arriving during provider chunk emission

Conversation title generation (optional) must not block main flow

DB locked/slow I/O on Windows (SQLite pragmas may be needed)

SSE reconnect: idempotency and duplicate events

15) Security Posture Checklist (Must Pass)

 Frontend contains no secrets, no provider URLs, no tokens

 Backend binds 127.0.0.1 by default

 CORS allowlist enforced

 Session cookies HttpOnly + Secure

 CSRF protection enabled for state-changing endpoints

 Rate limiting enabled

 Audit logs written for auth/admin actions

 No stack traces returned to client

 .env.example present; .env ignored

16) Documentation Requirements (Always Update)

When implementing a phase, update:

docs/architecture.md (high-level dataflow + modules)

docs/runbook.md (how to run, debug, backup/restore)

docs/threat_model.md (what threats are mitigated and how)

contracts/openapi.yaml or generated OpenAPI notes (version changes)

17) Output Format Requirement (For Every Delivery)

Every agent delivery must include:

Relevant file tree (only impacted paths)

Diffs (or full contents for new files)

Run commands (Windows PowerShell + cross-platform)

Test commands

Notes: limitations, next steps, failure modes
