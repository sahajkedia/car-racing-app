# Recommendation Engine — Problem Statement
**Oneness Dating App · Daily Sangha Ranking**

> Framed using the Problem Framing Skill  
> PROBLEM_COMPLEXITY = 7 · STAKEHOLDER_LEVEL = 8 · DEPLOYMENT_CONTEXT = 10

---

## The Business Ask (raw)

*"Design an algorithm to match profiles based on their preferred gender."*

This is the vague form. The skill says: never touch data until we've reframed it precisely.

---

## Step 1 — The Four Questions

### Q1. What decision will be made using this prediction?

The system selects and orders **10 profiles per user per day** (the "Daily Sangha"). Within those 10, the top profile is shown first — position matters because users are far more likely to act on the first card than the tenth.

The user then decides:
- `express_interest` → mutual check → match → conversation
- `silent_pass` → profile dropped from their pool

The downstream action is not "block or allow" — it is **"whom to show first."** This is a ranking decision, not a threshold decision.

### Q2. What output format does the decision-maker actually need?

A **ranked list** of compatible profiles, ordered by predicted mutual interest probability — not a binary yes/no, not a raw number shown to the user.

Internally the score lives in [0.0, 1.0]. The pilot rules translate this to:
- Score × 100 > 80 → shown in Pilot free tier
- Score × 100 > 60 → shown after free-tier pool exhausted
- Score × 100 > 90 → shown on paid plan (post-pilot)

The output is a **ranked list with an internal probability score**. Scores are never exposed to users.

### Q3. What does success look like in plain language?

| Stage | Success criterion |
|---|---|
| Pilot | Users exhaust the >80-score pool before needing the >60 pool (signals high-quality coverage) |
| Post-pilot | Mutual interest rate (both sides express_interest) > baseline rule-based system |
| 6 months | Message send rate per match > industry average for niche apps (~35%) |
| Product feel | "Gamified, psychologically triggered" — users feel each profile shown is *worth* a decision |

### Q4. What is the simplest non-ML baseline we must beat?

**The current rule-based pipeline is the baseline.** It already exists and is well-engineered:

1. Hard filters: gender, IE gate, distance ≤ 50 km, subscription, height range
2. Soft score: weighted sum of 9 sub-scores (age, intent, spiritual depth, diet, commitment, location, height, career, recency)
3. Default weights: age 0.20, intent 0.20, spiritual 0.20, diet 0.10, commitment 0.10, location 0.10, height 0.05, career 0.03, recency 0.02

Any ML approach must demonstrate a measurable lift over this baseline before replacing it.

---

## Step 2 — The Correct Problem Framing

### What this is NOT

| Default framing | Why it's wrong for Oneness |
|---|---|
| Binary classifier (will they match?) | Gives yes/no — we need ordering, not a gate |
| Single regression (compatibility score) | We already have this (the soft scorer). Adding ML must change the *weighting*, not just produce a number |
| Collaborative filtering ("users like you liked X") | Cold start problem is severe: the Isha community is small, signals are sparse at launch |
| Two-tower neural embeddings | Requires 100K+ interaction pairs to train stably; premature for pilot |

### What this IS

**A personalized Learning-to-Rank (LTR) problem** — specifically **pointwise scoring** that produces a ranked list.

**Target variable:** P(user_A expresses interest in profile_B **AND** profile_B expresses interest in user_A | features of A, features of B, context)

The bidirectionality is key. A unilateral interest score is insufficient — we want to maximize *mutual* connection probability, not one-sided attraction.

**Formal framing:**

```
Given:
  - user U with feature vector f_U
  - candidate pool C = {c1, c2, ..., cn} (post hard-filter, gender-compatible)
  - interaction history H = {(user_id, candidate_id, signal_type, timestamp)}

Predict:
  - score(U, ci) = P(U express_interest ci) × P(ci express_interest U)
  
Rank:
  - Return top-k candidates by score(U, ci), subject to:
      - score × 100 > 80 (pilot free tier)
      - score × 100 > 60 (pilot extended)
      - score × 100 > 90 (paid tier, post-pilot)
      - ci not seen in last 3 Daily Sangha sessions
      - ci active within last 10 days
```

---

## Step 3 — Gender Preference in the Framing

Gender is a **hard constraint**, not a scoring dimension. The existing `_gender_match` filter enforces bidirectional gender preference before any scoring runs.

The ML problem begins *after* this gate. The interesting question is not "does gender match" (binary, already solved) but:

> **Among all gender-compatible profiles, which ordering maximizes mutual connection probability?**

This means gender preference is fully handled by the hard filter pipeline. The recommendation engine's job is to rank the surviving pool by compatibility signal — and to *learn* what compatibility actually means from user behavior, rather than assuming hand-crafted weights are optimal.

---

## Step 4 — The Phased Roadmap (Framing → Implementation)

### Phase 1 (Now — Pilot): Instrumented Rule-Based Baseline

**What:** Keep the current weighted soft scorer. Add structured signal logging.

**Why:** You have no training data yet. The weights (age 0.20, spiritual 0.20, etc.) are expert priors — they may be right, they may be wrong. We won't know until we have signal data.

**What to instrument:**
```
signals table (already exists):
  - profile_viewed         → impression
  - express_interest       → positive label
  - silent_pass            → weak negative label
  - match_occurred         → strong positive (mutual)
  - message_sent           → strongest positive (conversion)
  - unmatched              → implicit negative signal
```

**Definition of a training example (for future Phase 2):**
```
(user_id, candidate_id, features_at_time_of_show, label)
  label = 1 if express_interest within 24h of show
  label = 0 if silent_pass or no action within 48h
```

**Minimum data before Phase 2 is possible:** ~500 mutual express_interest events (rough floor for logistic regression to be stable on 9–15 features).

---

### Phase 2 (1–3 months post-launch): Learned Pointwise Scorer

**Model type:** Logistic regression or LightGBM (gradient boosted trees)

**Why logistic regression first:**
- Directly outputs P(express_interest) — calibrated probability
- Interpretable — you can inspect learned feature weights vs. the hand-crafted ones
- Low data requirements — stable with ~200–500 positive examples
- Fast to retrain (can retrain weekly on new signal data)

**Feature set (for each user-candidate pair):**

| Feature | Type | Source |
|---|---|---|
| age_bucket_gap | numeric | profiles table |
| looking_for_gap | numeric | profiles table |
| avg_spiritual_depth | numeric | computed from daily_practices |
| diet_compat_score | numeric | DIET_COMPAT matrix |
| commitment_compat_score | numeric | COMMITMENT_COMPAT matrix |
| distance_km | numeric | PostGIS |
| height_in_preferred_range | binary | min/max_height_cm |
| days_since_last_active | numeric | last_active_at |
| both_have_job_title | binary | profiles table |
| user_action_count | numeric | signals table (cold start proxy) |
| candidate_express_interest_rate | numeric | signals table (how often does this person express interest?) |
| candidate_receive_interest_rate | numeric | signals table (how often do others express interest in them?) |

**Training objective:** binary cross-entropy on label = P(express_interest)

**Evaluation metric:** AUC-ROC on held-out users (NOT accuracy — the classes are heavily imbalanced)

**Business metric:** mutual interest rate uplift vs. Phase 1 baseline (A/B test for 2 weeks minimum)

---

### Phase 3 (6+ months, >10K users): Pairwise/Listwise LTR + Exploration

**Model type:** LambdaMART or Neural Collaborative Filtering (NCF)

**Why the upgrade:**
- Pairwise/listwise objectives directly optimize ranking metrics (NDCG, MRR) rather than pointwise probability
- At scale, user embeddings can capture latent compatibility signals not captured by hand-crafted features

**Exploration component:** Add a contextual bandit layer (Thompson Sampling or UCB) to allocate 10–15% of Daily Sangha slots to "explore" candidates — profiles the model is uncertain about. This prevents the feed from collapsing to a narrow band of "safe" high-score candidates and gathers signal on underrepresented profile types.

---

## Step 5 — What Could Go Wrong (Anti-Patterns to Avoid)

| Risk | Mitigation |
|---|---|
| Training on `profile_viewed` as a positive label | Views are impressions, not interest. Use `express_interest` as the positive label |
| Optimizing for express_interest rate, ignoring mutuality | Track mutual match rate as the *primary* business metric. High unilateral interest ≠ good recommendations |
| Showing the same high-scoring profiles repeatedly | Already addressed by the 3-session exclusion window in `build_daily_sangha` |
| Cold start collapse (new users see only popular profiles) | Existing `cold_start.py` handles this via diversity injection across CommitmentLevel buckets |
| Popularity bias (attractive profiles always ranked #1) | Normalize `candidate_receive_interest_rate` to avoid rich-get-richer dynamics |
| Ignoring the 10-day inactivity rule in scoring | The `recency` scorer partially handles this; Phase 2 must use `last_active_at` as a hard input feature |
| Deploying Phase 2 before you have enough data | Stick to Phase 1 until you have ≥500 positive labels. A poorly trained model is worse than the rule-based baseline |

---

## Step 6 — What Changes Downstream by Framing Choice

| If we frame as... | Loss function | Eval metric | Model | What we give up |
|---|---|---|---|---|
| Binary classifier | Binary cross-entropy | Accuracy / F1 | Logistic, XGBoost | No ordering — just yes/no |
| Pointwise LTR (recommended ✓) | Binary cross-entropy | AUC-ROC + mutual interest rate | Logistic, LightGBM | Not directly optimizing list quality |
| Pairwise LTR | Pairwise hinge loss | NDCG@10 | LambdaMART | Needs 10× more data to train |
| Collaborative filter | MSE on rating matrix | RMSE / Recall@K | Matrix factorization | Severe cold start in pilot |

**Recommendation: Start with pointwise LTR (Phase 2). It reuses existing feature engineering, outputs calibrated probabilities that map directly to the >80/>60/>90 threshold rules, and trains on the same signal schema already deployed.**

---

## Summary

| Dimension | Answer |
|---|---|
| Problem type | Personalized Learning-to-Rank (pointwise scoring) |
| Target variable | P(mutual express_interest \| user features, candidate features) |
| Output | Ranked list of ≤10 profiles, filtered by score threshold |
| Gender preference | Hard filter (bidirectional gate), not a scoring dimension |
| Baseline to beat | Existing rule-based soft scorer (9 sub-scores, hand-crafted weights) |
| Phase 1 goal | Instrument signals, validate baseline, accumulate training data |
| Phase 2 model | LightGBM or logistic regression on 12–15 pairwise features |
| Primary eval metric | Mutual interest rate (business) + AUC-ROC (model) |
| Minimum data for Phase 2 | ~500 mutual express_interest events |
| Biggest risk | Training too early, on the wrong label, before signal data matures |
