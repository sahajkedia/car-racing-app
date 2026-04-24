# Graph Report - oneness  (2026-04-25)

## Corpus Check
- 51 files · ~18,820 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 300 nodes · 785 edges · 13 communities detected
- Extraction: 46% EXTRACTED · 54% INFERRED · 0% AMBIGUOUS · INFERRED: 421 edges (avg confidence: 0.57)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]

## God Nodes (most connected - your core abstractions)
1. `UserProfile` - 58 edges
2. `CommitmentLevel` - 38 edges
3. `IEStatus` - 38 edges
4. `LookingFor` - 31 edges
5. `IshaPractice` - 31 edges
6. `DietType` - 31 edges
7. `ScoringWeights` - 26 edges
8. `ColdStartStrategy` - 26 edges
9. `SpiritualProfile` - 25 edges
10. `Location` - 24 edges

## Surprising Connections (you probably didn't know these)
- `Oneness Scoring Engine — Hard Filters (Phase 1)  Hard filters eliminate candidat` --uses--> `UserProfile`  [INFERRED]
  oneness/scoring/hard_filters.py → oneness/models/user_profile.py
- `Bidirectional: user must want candidate's gender AND candidate must want user's` --uses--> `UserProfile`  [INFERRED]
  oneness/scoring/hard_filters.py → oneness/models/user_profile.py
- `Candidate must fall within the user's stated height range preference.     Only e` --uses--> `UserProfile`  [INFERRED]
  oneness/scoring/hard_filters.py → oneness/models/user_profile.py
- `Candidate must be within DEFAULT_MAX_DISTANCE_KM of the user.     distance_km mu` --uses--> `UserProfile`  [INFERRED]
  oneness/scoring/hard_filters.py → oneness/models/user_profile.py
- `Pilot gate: both user and candidate must have a qualifying IE status.     This i` --uses--> `UserProfile`  [INFERRED]
  oneness/scoring/hard_filters.py → oneness/models/user_profile.py

## Communities

### Community 0 - "Community 0"
Cohesion: 0.22
Nodes (33): CommitmentLevel, DietType, IEStatus, IshaPractice, LookingFor, Oneness Scoring Engine — Configuration  All tunable constants live here. Nothing, Enum, get_sangha() (+25 more)

### Community 1 - "Community 1"
Cohesion: 0.1
Nodes (34): cold_start_weights(), ColdStartStrategy, Oneness Scoring Engine — Cold Start Handler  Cold start problem: a new user has, If the eligible pool after hard filters is smaller than min_pool_size,         s, Ensure the Daily Sangha for a cold start user contains a spread         of spiri, Returns True if this user should be handled by cold start logic., Return adjusted scoring weights for a cold start user.      For a new user we ha, Encapsulates the full cold start approach for Oneness Phase 1.      The strategy (+26 more)

### Community 2 - "Community 2"
Cohesion: 0.15
Nodes (10): apply_hard_filters(), Apply all hard filters to a candidate pool.      Returns only the candidates tha, build_daily_sangha(), compute_soft_score(), score_breakdown(), _make_female(), _make_male(), TestHardFilters (+2 more)

### Community 3 - "Community 3"
Cohesion: 0.12
Nodes (25): BaseModel, Profile endpoints — onboarding steps + photo upload + read.  Onboarding is step-, Returns a profile card (no salary, no subscription info)., Return profile_id or raise 404., Send a 6-digit OTP to the provided phone number., Verify the OTP and return a session. Creates account on first use., Upload 3–9 profile photos. This is step 1 of onboarding., Exchange a refresh token for a new access token. (+17 more)

### Community 4 - "Community 4"
Cohesion: 0.12
Nodes (25): get_current_user(), FastAPI dependency injection.  `get_current_user` validates the Supabase JWT fro, Validate Supabase JWT and return user info.      Returns dict with keys: user_id, get_my_profile(), get_profile(), get_thread(), list_threads(), mark_read() (+17 more)

### Community 5 - "Community 5"
Cohesion: 0.09
Nodes (17): advance(), onExpressInterest(), onSilentPass(), openProfile(), sendMessage(), getCtx(), playSound(), withSound() (+9 more)

### Community 6 - "Community 6"
Cohesion: 0.17
Nodes (14): _active_subscription_filter(), FilterResult, _gender_match(), _height_range_filter(), _location_filter(), _profile_complete_filter(), Oneness Scoring Engine — Hard Filters (Phase 1)  Hard filters eliminate candidat, Bidirectional: user must want candidate's gender AND candidate must want user's (+6 more)

### Community 7 - "Community 7"
Cohesion: 0.19
Nodes (8): EngagementSignal, FeedbackPromptPolicy, Oneness — Feedback Signal Collector  This module defines the signal types the ap, A single behavioral event between two users., The gold-label collection mechanism.      Triggered by an in-app prompt sent to, Controls when and how often to ask users for relationship status updates.     Co, RelationshipReport, TestFeedbackSignals

### Community 8 - "Community 8"
Cohesion: 0.17
Nodes (13): PairFeatureRow, Oneness MLOps Data Pipeline — Phase 1  This module bridges the app's behavioral, Step 2: Join behavioral signals onto each (viewer, candidate) pair.      In Phas, Step 3: Compute dataset statistics for drift monitoring and data validation., Step 4: Basic data validation — flags data quality issues.      Checks that sign, Full Phase 1 pipeline. Call this from a cron job or Supabase Edge Function., One row in the training dataset. Represents a (viewer, candidate) pair     shown, Step 1: Ingest Sangha session records.      In Phase 2, this becomes:         @s (+5 more)

### Community 9 - "Community 9"
Cohesion: 0.43
Nodes (3): is_cold_start_user(), _make_user(), TestColdStart

### Community 10 - "Community 10"
Cohesion: 1.0
Nodes (2): getToken(), request()

### Community 11 - "Community 11"
Cohesion: 0.67
Nodes (1): Oneness Dating App — FastAPI entry point

### Community 12 - "Community 12"
Cohesion: 0.67
Nodes (2): BaseSettings, Settings

## Knowledge Gaps
- **24 isolated node(s):** `Oneness Dating App — FastAPI entry point`, `FastAPI dependency injection.  `get_current_user` validates the Supabase JWT fro`, `Validate Supabase JWT and return user info.      Returns dict with keys: user_id`, `Supabase client factory.  Two clients: - `get_anon_client()` — uses anon key; re`, `Send a 6-digit OTP to the provided phone number.` (+19 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 10`** (3 nodes): `getToken()`, `request()`, `api.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 11`** (3 nodes): `main.py`, `health()`, `Oneness Dating App — FastAPI entry point`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 12`** (3 nodes): `config.py`, `BaseSettings`, `Settings`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `UserProfile` connect `Community 1` to `Community 0`, `Community 2`, `Community 3`, `Community 6`, `Community 7`, `Community 9`?**
  _High betweenness centrality (0.191) - this node is a cross-community bridge._
- **Why does `Profile endpoints — onboarding steps + photo upload + read.  Onboarding is step-` connect `Community 3` to `Community 0`, `Community 1`, `Community 4`?**
  _High betweenness centrality (0.145) - this node is a cross-community bridge._
- **Why does `TestHardFilters` connect `Community 2` to `Community 0`, `Community 1`, `Community 7`?**
  _High betweenness centrality (0.039) - this node is a cross-community bridge._
- **Are the 55 inferred relationships involving `UserProfile` (e.g. with `TestAgeBuckets` and `TestHardFilters`) actually correct?**
  _`UserProfile` has 55 INFERRED edges - model-reasoned connections that need verification._
- **Are the 35 inferred relationships involving `CommitmentLevel` (e.g. with `TestAgeBuckets` and `TestHardFilters`) actually correct?**
  _`CommitmentLevel` has 35 INFERRED edges - model-reasoned connections that need verification._
- **Are the 35 inferred relationships involving `IEStatus` (e.g. with `TestAgeBuckets` and `TestHardFilters`) actually correct?**
  _`IEStatus` has 35 INFERRED edges - model-reasoned connections that need verification._
- **Are the 28 inferred relationships involving `LookingFor` (e.g. with `TestAgeBuckets` and `TestHardFilters`) actually correct?**
  _`LookingFor` has 28 INFERRED edges - model-reasoned connections that need verification._