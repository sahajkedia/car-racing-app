# V1 Backend Scope

## Product Shape

This backend supports a web-first spiritually aligned meeting product with request-based messaging.

The primary user journey is:

1. create account
2. complete profile and spiritual preferences
3. discover relevant people
4. send a message request
5. accept request
6. continue conversation in chat

## Supported V1 Features

- account registration and login
- profile editing
- spiritual profile editing
- discovery preference editing
- rules-based candidate discovery
- message request send, list, accept, reject
- chat after request acceptance
- unread counts
- block and report flows
- admin report listing
- structured event logging

## Deliberate V1 Exclusions

- paid subscriptions
- mobile-specific APIs
- machine-learned ranking
- video or voice chat
- external push notification providers
- complex moderation automation

## Eligibility Rules

- users cannot message themselves
- blocked pairs cannot interact
- only active and visible profiles appear in discovery
- discovery uses opposite-gender filtering for the current product assumption
- a request can only exist once per sender and recipient while pending
- a conversation can only exist after a request is accepted

## Discovery Ranking Rules

The initial candidate ranking is intentionally simple and explainable:

- required filters first: visibility, account status, gender preference, age range, and optional city/language/spiritual fields
- then a lightweight score based on:
  - same city
  - shared language
  - overlap in spiritual values
  - closeness to preferred age range midpoint

This gives predictable performance and a clear baseline before introducing embeddings or model-based ranking.

## API Non-Goals

- no GraphQL in v1
- no microservice network in v1
- no event bus outside Redis queues in v1

## Launch Guardrails

- rate limit auth, message request, and message send endpoints
- require request acceptance before chat
- support block and report from day one
- expose health and readiness endpoints
- log critical lifecycle events for later analytics
