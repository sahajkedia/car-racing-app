# Oneness — Cold Start Strategy

## The Problem

A new user has:
- No messages sent
- No profiles engaged with
- No behavioral signal whatsoever

The scoring engine's learned weights (Phase 2+) are useless. The engine
must fall back to rule-based priors — but which priors, and with what
adjustments?

---

## Definition

A user is in cold start if BOTH conditions are true:
- They joined fewer than 14 days ago, AND
- They have fewer than 10 total actions (messages sent + profiles viewed)

A user exits cold start when EITHER condition is no longer true.

---

## Three-Part Cold Start Strategy

### Part 1 — Adjusted Weights

Cold start users get upweighted spiritual and intent signals because:
- These are stable, objective, and don't require behavioral data to be accurate
- They are the most likely predictors of long-term compatibility for this community
- Demographic signals (height, career) have not been validated as LTR predictors yet

Cold start weights vs default:
| Signal | Default | Cold Start |
|---|---|---|
| Age bucket | 0.20 | 0.20 |
| Looking for (intent) | 0.20 | 0.22 (+0.02) |
| Spiritual depth | 0.20 | 0.22 (+0.02) |
| Diet compat | 0.10 | 0.12 (+0.02) |
| Commitment compat | 0.10 | 0.12 (+0.02) |
| Location proximity | 0.10 | 0.08 (-0.02) |
| Height compat | 0.05 | 0.02 (-0.03) |
| Career level | 0.03 | 0.01 (-0.02) |
| Recency | 0.02 | 0.01 (-0.01) |

### Part 2 — Diversity Injection

Without diversity injection, every cold start user's first Sangha would
contain 10 deeply-committed Shambhavi practitioners who live nearby.

This is algorithmically correct but strategically wrong: if many such
users turn out to prefer regular practitioners in practice, we never
discover that preference because we never show them a regular practitioner.

**Diversity targets for the first Sangha:**
- ~40% deeply committed practitioners
- ~40% regular practitioners
- ~20% casual explorers

This lets the engine observe which tier the user gravitates toward and
adjust future rankings accordingly.

### Part 3 — Location Radius Expansion

If the eligible pool after hard filters is fewer than 30 candidates,
expand the search radius progressively:

```
Default: 100km
Step 1:  250km  (if pool < 30 candidates)
Step 2:  500km  (if pool still < 30 candidates after 250km)
Maximum: 500km  (never remove location as a hard filter entirely)
```

This handles the thin-pool problem during the pilot (early users in
smaller cities may have very few eligible candidates within 100km).

---

## Cold Start Exit Transition

When a user exits cold start:
1. Switch from cold start weights to default weights
2. Disable diversity injection (let scores drive ranking fully)
3. Log the transition — this is a model training event

The first 10 engagements (cold start window) constitute a mini-experiment.
After exit, analyse which diversity bucket the user engaged with most.
This per-user signal seeds their preference profile before Phase 2 begins.

---

## What Cold Start Does NOT Do

- Does NOT lower the spiritual gate. Every user — cold or warm — must pass
  the IE pilot gate. There is no "light" version for new users.
- Does NOT show incomplete profiles. Profile quality is a hard filter
  regardless of pool size.
- Does NOT tell the user they are in cold start mode. The UX is seamless.
