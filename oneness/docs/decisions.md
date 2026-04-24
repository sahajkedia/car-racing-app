# Oneness — Architectural Decisions Record

Resolved decisions locked before any code is merged. Each decision is immutable unless a new ADR overrides it.

---

## ADR-001: UI Paradigm — Conscious Queue

**Decision**: Neither swipe nor browse-cards. A third model: the **Conscious Queue**.

**What it is:**
- Each day, a user receives exactly 10 curated profiles — their "Daily Sangha"
- All 10 are revealed at once as a mindful vertical scroll (not a card stack, not a swipe deck)
- Each profile is a full card with photo moodboard, bio, spiritual practices, and a brief career note
- The user has a **24-hour window** to act on any profile in their Sangha
- After 24 hours (or after acting on all 10), the queue refreshes

**Actions available on each profile:**
- **Express Interest** — sends an in-app message opener; signals intent to the scoring engine
- **Silent Pass** — no notification is sent to the other person; respects dignity, eliminates anxiety of rejection

**Why this is different:**
- Eliminates infinite-scroll gamification (no dopamine loop)
- Forces intentionality: you have 10 people, 24 hours, one decision per person
- Aligned with Isha community values (deliberateness, non-reactivity)
- "Silent Pass" is a spiritual-community-native UX pattern — no one gets a rejection notification

**Behavioral signals collected:**
- `time_spent_on_profile_ms` — how long a user read a profile before acting
- `scroll_depth_on_profile` — did they read the whole bio or just look at photos
- `message_content_quality` — message length, sentiment (future ML signal)
- `session_time_of_day` — morning users vs evening users (correlates with profile type)

---

## ADR-002: Payment Model — Subscription

**Decision**: Subscription-only. No freemium tier for the pilot.

**Rationale:**
- Filters for serious intent — only people genuinely looking for a relationship pay
- Simplifies scoring engine (no "free vs paid" feature flags to manage)
- Community trust: spiritual seekers are accustomed to paying for Isha programs; this frames the app as a premium curated service, not a free commodity
- Pricing TBD (recommend ₹499/month or ₹3999/year for the India pilot)

**What subscription unlocks:**
- Full access to Daily Sangha (10 profiles/day)
- Unlimited messaging within your Sangha
- Relationship reporting and feedback tools

**What is gated even for subscribers:**
- Boosting / prioritizing your profile (no pay-to-win ranking manipulation)

---

## ADR-003: Match Reveal — Open Messaging (No Gatekeeping)

**Decision**: Any user can send a message to any profile in their Daily Sangha. No mutual match required.

**Rationale:**
- Eliminates the "waiting game" anxiety of mutual matching
- Aligned with spiritual values of directness and openness
- A sent message IS the signal of interest — it replaces the "like" mechanic entirely
- The receiving user decides whether to respond; silence = natural pass

**Behavioral interpretation:**
- `message_sent` = explicit interest (strong signal for scoring engine)
- `message_replied` = mutual interest (strongest proxy signal for LTR prediction)
- `conversation_thread_length` = engagement depth (used as proxy label for model training)

---

## Summary Table

| Decision | Choice | Rationale |
|---|---|---|
| UI paradigm | Conscious Queue (10 profiles, 24hr window, silent pass) | Intentionality over volume |
| Payment | Subscription only | Serious intent filter, community trust |
| Match reveal | Open messaging (anyone messages anyone in their Sangha) | Openness, eliminates waiting anxiety |
