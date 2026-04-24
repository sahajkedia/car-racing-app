# Oneness — Spiritual Differentiation Layer

This document defines the spiritual signals collected during onboarding,
their scoring weights, and the rationale for each design choice.

---

## Why This Layer Exists

A dating app that doesn't capture spiritual signals cannot produce
spiritually-aligned matches. Without this layer, Oneness is Hinge
with a different colour palette. Every question in this layer exists
to serve the scoring engine — not as profile decoration.

---

## Onboarding Questions (Spiritual Block)

Placed after the height questions and before "About Me" in the flow.

### Q1 — Inner Engineering Status

> "Have you completed Inner Engineering?"

Options:
- Completed Inner Engineering + Shambhavi Mahamudra initiation
- Completed Inner Engineering (online or offline)
- Currently doing Inner Engineering / in progress
- Not yet — but I practise other forms of meditation/yoga

**Scoring use**: This is the pilot hard-filter gate. Anyone who answers
"Not yet" and does not practise any Isha practice is excluded from the
Isha pilot pool. In Phase 2 (expansion), this becomes a soft signal.

**UI note**: Do not use the word "gate" or "requirement" in copy.
Frame as "so we can connect you with people on a similar path."

---

### Q2 — Daily Practices

> "What do you practise regularly? (Select all that apply)"

Options (multi-select):
- Shambhavi Mahamudra
- Surya Kriya
- Hatha Yoga (Isha)
- Bhuta Shuddhi
- Isha Kriya
- Yogasanas
- Chanting / Nada
- Other meditation (non-Isha)

**Scoring use**: Mapped to `PRACTICE_DEPTH_WEIGHTS` in `config.py`.
The depth score is the max weight among selected practices (not the sum —
someone who only does Shambhavi scores higher than someone who does
seven light practices but not a single demanding one).

---

### Q3 — Diet and Lifestyle

> "What best describes your diet?"

Options (single select):
- Sattvic (vegetarian, no onion/garlic)
- Vegan
- Vegetarian
- Occasionally non-vegetarian
- Non-vegetarian

**Scoring use**: Mapped to the `DIET_COMPAT` matrix in `config.py`.
A sattvic-vegan pair scores 0.8; a sattvic-non-veg pair scores 0.0 —
because lifestyle incompatibility is a well-documented cause of
long-term relationship stress in the Isha community.

---

### Q4 — Relationship with the Path

> "How would you describe your relationship with your spiritual practice?"

Options (single select):
- Deeply committed — daily sadhana, regularly attend programs and retreats
- Regular practitioner — consistent practice, occasional programs
- Casually exploring — curious, sometimes practise

**Scoring use**: Mapped to `COMMITMENT_COMPAT` in `config.py`.
A deeply committed person paired with a casual explorer scores 0.20 —
not zero (it's possible), but significantly penalised. This prevents
mismatches that historically cause friction in spiritual partnerships.

---

## Scoring Weight Rationale

| Signal | Weight | Why |
|---|---|---|
| Spiritual depth (practices) | 0.20 | The app's primary differentiator |
| Commitment level (compat) | 0.10 | Prevents depth-mismatch attrition |
| Diet compat | 0.10 | Lifestyle friction is a top-3 LTR breaker |
| Looking For (intent) | 0.20 | Must-match for serious seekers |
| Age bucket | 0.20 | Life-stage alignment |
| Location proximity | 0.10 | In-person meet is the goal |
| Height compat | 0.05 | User preference, not a predictor |
| Career level | 0.03 | Low signal until validated |
| Recency | 0.02 | Freshness hygiene |

Spiritual signals collectively account for **0.40** of the total score —
double any single demographic signal. This is the design intent.

---

## Phase 2 Extensions (Post-Pilot)

Once behavioral data is available (Phase 2, 500+ engagements):

1. **Practice overlap score**: Two users who both do Shambhavi + Surya Kriya
   score higher than two users who both do general meditation — shared
   specific practice is a stronger bonding signal.

2. **Program history overlap**: Both attended the same Isha program type
   (e.g., Samyama, BSP, Inner Engineering residential). This is a latent
   community signal that predicts real-world shared context.

3. **Spiritual growth trajectory**: Are they deepening their practice over
   time or static? (Inferred from program history if available.)

These are Phase 2 features. Do not build them for the pilot.
