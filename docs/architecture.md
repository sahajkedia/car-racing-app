# Backend Architecture

## Goals

- Low-latency reads for discovery and inbox surfaces.
- Safe request-based messaging instead of fully open chat.
- Open-source, self-hostable infrastructure.
- Clean upgrade path from rules-first discovery to smarter ranking later.

## Stack

- Language: Go
- API transport: REST + WebSocket
- Primary store: PostgreSQL
- Cache and ephemeral state: Redis
- Background jobs: Asynq on Redis
- Container runtime: Docker Compose for local development

## Architectural Style

The backend is a modular monolith:

- `apps/api` owns the HTTP and WebSocket server.
- `apps/worker` owns asynchronous tasks.
- `internal/platform` contains shared runtime concerns such as config, auth, database, queueing, and realtime fanout.
- `apps/api/internal/*` contains product modules and request handlers.

This keeps the codebase simple while preserving extraction boundaries if traffic later demands separate services.

## Domain Modules

- `auth`: registration, login, bearer token auth.
- `users`: account profile and account state.
- `spiritual`: values, practices, and alignment fields used for discovery.
- `discovery`: eligibility filtering and rules-first ranking.
- `requests`: message request workflow.
- `chat`: conversations, messages, unread state, realtime delivery.
- `safety`: blocking, reporting, and moderation hooks.
- `admin`: review queue for reports and account actions.
- `events`: append-only interaction logging for analytics and future ranking.

## Runtime Flow

1. A user authenticates and receives a signed access token.
2. Profile, spiritual profile, and discovery preferences are stored in PostgreSQL.
3. Discovery queries fetch eligible candidates from PostgreSQL, apply a lightweight score, and log exposure events.
4. Sending a first contact creates a `message_request`.
5. Accepting a request creates a `conversation`.
6. Messages are appended to PostgreSQL, unread counters are updated in Redis, and realtime notifications are broadcast over WebSocket.
7. Side effects such as notifications and moderation review are pushed to Asynq workers.

## Request-Accept Messaging Model

- Any eligible user can send a first message request to another eligible user.
- A request contains an intro message and remains pending until the recipient accepts or rejects it.
- Full conversation threads are not created until acceptance.
- Blocks short-circuit every messaging surface.
- Reports can be filed against users or conversations at any time.

## Data Ownership

- PostgreSQL is the system of record for users, profiles, requests, conversations, messages, blocks, reports, and interaction events.
- Redis is used for rate limiting, unread counters, and short-lived cache entries.
- Worker tasks are durable enough for v1 through Redis-backed queues; critical state still persists in PostgreSQL.

## Latency Strategy

- Keep discovery queries index-friendly and deterministic.
- Avoid expensive joins in the message send path.
- Use append-only writes for messages and event logs.
- Push notifications, moderation enrichment, and future recommendation refreshes into async tasks.
- Prefer simple ranking logic over online model inference in v1.

## Security And Safety

- Use signed bearer tokens with short expiration.
- Hash passwords with bcrypt.
- Apply IP and user rate limits on auth and messaging endpoints.
- Enforce eligibility, block rules, and self-message prevention at the service layer.
- Keep audit-friendly report and enforcement records.

## Extraction Boundaries

If scale later demands decomposition, the easiest first splits are:

- realtime gateway from API server
- worker process from API runtime
- discovery service from transactional API flows

The schema and module boundaries in v1 are designed so those splits can happen without reworking the product model.
