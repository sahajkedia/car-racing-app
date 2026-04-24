"""
Oneness Scoring Engine — Test Suite

Tests cover:
- Age bucket correctness (including the fixed 36-overlap bug)
- Hard filter logic for each filter type
- Soft scorer sub-scores and weighted total
- Cold start detection and weight selection
- End-to-end ranking engine (build_daily_sangha)
- Feedback signal model
"""

from __future__ import annotations
import pytest
from datetime import date, datetime, timezone, timedelta

from oneness.models.user_profile import (
    UserProfile,
    Location,
    SpiritualProfile,
    CareerProfile,
)
from oneness.scoring.config import (
    AGE_BUCKETS,
    CommitmentLevel,
    DietType,
    IEStatus,
    IshaPractice,
    LookingFor,
    AGE_BUCKET_MAX_GAP,
)
from oneness.scoring.hard_filters import apply_hard_filters
from oneness.scoring.soft_scorer import compute_soft_score, score_breakdown
from oneness.scoring.cold_start import is_cold_start_user, ColdStartStrategy
from oneness.scoring.ranking_engine import build_daily_sangha
from oneness.feedback.signal_collector import (
    FeedbackPromptPolicy,
    SignalType,
    SIGNAL_STRENGTH,
)


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

def _make_user(
    user_id: str = "u1",
    dob: date = date(1992, 6, 15),   # age ~33 → bucket index 2 (31-36)
    gender: str = "female",
    interested_in: str = "male",
    height_cm: int = 163,
    min_height_cm: int = 170,
    max_height_cm: int = 0,
    looking_for: LookingFor = LookingFor.DATE_TO_MARRY,
    ie_status: IEStatus = IEStatus.COMPLETED_SHAMBHAVI,
    practices: list[IshaPractice] | None = None,
    diet: DietType = DietType.SATTVIC,
    commitment: CommitmentLevel = CommitmentLevel.DEEPLY_COMMITTED,
    distance_km: float = 15.0,
    last_active_days_ago: int = 0,
    subscription_active: bool = True,
    joined_days_ago: int = 60,
    photo_count: int = 5,
    about_me: str = "Seeker on the path.",
) -> UserProfile:
    now = datetime.now(timezone.utc)
    return UserProfile(
        user_id=user_id,
        name="Test User",
        dob=dob,
        gender=gender,
        interested_in_gender=interested_in,
        location=Location(city="Coimbatore", state="Tamil Nadu"),
        looking_for=looking_for,
        height_cm=height_cm,
        min_height_cm=min_height_cm,
        max_height_cm=max_height_cm,
        about_me=about_me,
        spiritual=SpiritualProfile(
            ie_status=ie_status,
            daily_practices=practices or [IshaPractice.SHAMBHAVI],
            diet=diet,
            commitment_level=commitment,
        ),
        career=CareerProfile(job_title="Engineer", degree="B.Tech"),
        photo_urls=[f"photo_{i}.jpg" for i in range(photo_count)],
        is_active=True,
        last_active_at=now - timedelta(days=last_active_days_ago),
        joined_at=now - timedelta(days=joined_days_ago),
        subscription_active=subscription_active,
        distance_km=distance_km,
    )


def _make_male(**kwargs) -> UserProfile:
    kwargs.setdefault("height_cm", 178)
    kwargs.setdefault("min_height_cm", 155)
    return _make_user(gender="male", interested_in="female", **kwargs)


def _make_female(**kwargs) -> UserProfile:
    kwargs.setdefault("height_cm", 163)
    kwargs.setdefault("min_height_cm", 170)
    return _make_user(gender="female", interested_in="male", **kwargs)


# ---------------------------------------------------------------------------
# Age Bucket Tests
# ---------------------------------------------------------------------------

class TestAgeBuckets:

    def test_buckets_are_non_overlapping(self):
        """The 36-overlap bug is fixed: no age should appear in two buckets."""
        all_ages = set()
        for lo, hi in AGE_BUCKETS:
            for age in range(lo, hi + 1):
                assert age not in all_ages, f"Age {age} appears in multiple buckets!"
                all_ages.add(age)

    def test_age_36_is_in_bucket_2_only(self):
        """Age 36 should fall in bucket index 2 (31-36), not bucket 3 (37-42)."""
        profile = _make_user(dob=date(date.today().year - 36, 1, 1))
        assert profile.age_bucket_index == 2

    def test_age_37_is_in_bucket_3(self):
        profile = _make_user(dob=date(date.today().year - 37, 1, 1))
        assert profile.age_bucket_index == 3

    def test_age_outside_buckets_returns_minus_one(self):
        """Age 17 and 51 should return -1 (not in any bucket)."""
        too_young = _make_user(dob=date(date.today().year - 17, 1, 1))
        too_old = _make_user(dob=date(date.today().year - 51, 1, 1))
        assert too_young.age_bucket_index == -1
        assert too_old.age_bucket_index == -1


# ---------------------------------------------------------------------------
# Hard Filter Tests
# ---------------------------------------------------------------------------

class TestHardFilters:

    def test_gender_mismatch_eliminates_candidate(self):
        user = _make_female(user_id="u1")
        candidate = _make_female(user_id="u2")  # female seeking male, showing female
        result = apply_hard_filters(user, [candidate])
        assert len(result) == 0

    def test_gender_match_passes(self):
        user = _make_female(user_id="u1")
        candidate = _make_male(user_id="u2")
        result = apply_hard_filters(user, [candidate])
        assert len(result) == 1

    def test_subscription_inactive_eliminates(self):
        user = _make_female(user_id="u1")
        candidate = _make_male(user_id="u2", subscription_active=False)
        result = apply_hard_filters(user, [candidate])
        assert len(result) == 0

    def test_incomplete_profile_eliminated(self):
        user = _make_female(user_id="u1")
        candidate = _make_male(user_id="u2", photo_count=1)  # needs 3 minimum
        result = apply_hard_filters(user, [candidate])
        assert len(result) == 0

    def test_ie_not_done_eliminated_in_pilot(self):
        user = _make_female(user_id="u1")
        candidate = _make_male(user_id="u2", ie_status=IEStatus.NOT_DONE)
        result = apply_hard_filters(user, [candidate])
        assert len(result) == 0

    def test_height_below_minimum_eliminated(self):
        user = _make_female(user_id="u1", min_height_cm=175)
        candidate = _make_male(user_id="u2", height_cm=170)
        result = apply_hard_filters(user, [candidate])
        assert len(result) == 0

    def test_height_above_minimum_passes(self):
        user = _make_female(user_id="u1", min_height_cm=170)
        candidate = _make_male(user_id="u2", height_cm=178)
        result = apply_hard_filters(user, [candidate])
        assert len(result) == 1

    def test_distance_exceeds_max_eliminated(self):
        user = _make_female(user_id="u1")
        candidate = _make_male(user_id="u2", distance_km=150.0)
        result = apply_hard_filters(user, [candidate])
        assert len(result) == 0

    def test_user_never_sees_own_profile(self):
        user = _make_female(user_id="u1")
        result = apply_hard_filters(user, [user])
        assert len(result) == 0

    def test_age_bucket_is_soft_not_hard_filter(self):
        # Age bucket gap does NOT eliminate — it only lowers soft score.
        # user in bucket 0 (18-23), candidate in bucket 3 (37-42) — gap of 3
        user = _make_female(user_id="u1", dob=date(date.today().year - 21, 1, 1))
        candidate = _make_male(user_id="u2", dob=date(date.today().year - 39, 1, 1))
        result = apply_hard_filters(user, [candidate])
        # Should PASS hard filter — age is soft
        assert len(result) == 1


# ---------------------------------------------------------------------------
# Soft Scorer Tests
# ---------------------------------------------------------------------------

class TestSoftScorer:

    def _ideal_pair(self):
        user = _make_female(user_id="u1", distance_km=5.0)
        candidate = _make_male(user_id="u2", distance_km=5.0)
        return user, candidate

    def test_ideal_match_scores_high(self):
        user, candidate = self._ideal_pair()
        score = compute_soft_score(user, candidate)
        assert score > 0.80, f"Ideal pair scored too low: {score}"

    def test_diet_mismatch_lowers_score(self):
        user = _make_female(user_id="u1", diet=DietType.SATTVIC, distance_km=5.0)
        candidate_good = _make_male(user_id="u2", diet=DietType.SATTVIC, distance_km=5.0)
        candidate_bad = _make_male(user_id="u3", diet=DietType.NON_VEG, distance_km=5.0)
        score_good = compute_soft_score(user, candidate_good)
        score_bad = compute_soft_score(user, candidate_bad)
        assert score_good > score_bad

    def test_intent_mismatch_lowers_score(self):
        user = _make_female(user_id="u1", looking_for=LookingFor.DATE_TO_MARRY_SOON, distance_km=5.0)
        c_aligned = _make_male(user_id="u2", looking_for=LookingFor.DATE_TO_MARRY_SOON, distance_km=5.0)
        c_misaligned = _make_male(user_id="u3", looking_for=LookingFor.SHORT_TERM, distance_km=5.0)
        assert compute_soft_score(user, c_aligned) > compute_soft_score(user, c_misaligned)

    def test_far_candidate_scores_lower_than_nearby(self):
        user = _make_female(user_id="u1")
        nearby = _make_male(user_id="u2", distance_km=10.0)
        far = _make_male(user_id="u3", distance_km=90.0)
        assert compute_soft_score(user, nearby) > compute_soft_score(user, far)

    def test_score_breakdown_keys_match_weights(self):
        user, candidate = self._ideal_pair()
        breakdown = score_breakdown(user, candidate)
        expected_keys = {
            "age_bucket", "looking_for", "spiritual_depth", "diet_compat",
            "commitment_compat", "location_proximity", "height_compat",
            "career_level", "recency", "total"
        }
        assert set(breakdown.keys()) == expected_keys

    def test_score_bounded_zero_to_one(self):
        user, candidate = self._ideal_pair()
        score = compute_soft_score(user, candidate)
        assert 0.0 <= score <= 1.0


# ---------------------------------------------------------------------------
# Cold Start Tests
# ---------------------------------------------------------------------------

class TestColdStart:

    def test_brand_new_user_is_cold_start(self):
        user = _make_user(joined_days_ago=0)
        assert is_cold_start_user(user, action_count=0) is True

    def test_user_with_enough_actions_exits_cold_start(self):
        user = _make_user(joined_days_ago=2)
        assert is_cold_start_user(user, action_count=10) is False

    def test_old_user_exits_cold_start(self):
        user = _make_user(joined_days_ago=20)
        assert is_cold_start_user(user, action_count=0) is False

    def test_diversity_injection_respects_final_count(self):
        strategy = ColdStartStrategy()
        candidates = [_make_male(user_id=f"u{i}") for i in range(50)]
        result = strategy.inject_diversity(candidates, final_count=10)
        assert len(result) <= 10

    def test_cold_start_weights_sum_to_one(self):
        from oneness.scoring.cold_start import cold_start_weights
        user = _make_user()
        weights = cold_start_weights(user)
        total = sum(vars(weights).values())
        assert abs(total - 1.0) < 1e-6


# ---------------------------------------------------------------------------
# Ranking Engine (End-to-End) Tests
# ---------------------------------------------------------------------------

class TestRankingEngine:

    def _build_pool(self, n: int = 20) -> list[UserProfile]:
        return [
            _make_male(user_id=f"cand_{i}", distance_km=float(i * 3 + 5))
            for i in range(n)
        ]

    def test_sangha_size_capped_at_10(self):
        user = _make_female(user_id="requester")
        pool = self._build_pool(50)
        result = build_daily_sangha(user, pool)
        assert len(result.candidates) <= 10

    def test_self_never_in_sangha(self):
        user = _make_female(user_id="requester")
        pool = self._build_pool(20)
        pool.append(user)  # inject self into pool
        result = build_daily_sangha(user, pool)
        ids = [s.profile.user_id for s in result.candidates]
        assert "requester" not in ids

    def test_cold_start_user_flagged_correctly(self):
        user = _make_female(user_id="requester", joined_days_ago=1)
        pool = self._build_pool(20)
        result = build_daily_sangha(user, pool, user_action_count=0)
        assert result.is_cold_start is True

    def test_warm_user_not_flagged_as_cold_start(self):
        user = _make_female(user_id="requester", joined_days_ago=30)
        pool = self._build_pool(20)
        result = build_daily_sangha(user, pool, user_action_count=15)
        assert result.is_cold_start is False

    def test_previously_seen_profiles_deprioritised(self):
        user = _make_female(user_id="requester", joined_days_ago=30)
        pool = self._build_pool(30)
        seen_ids = {c.user_id for c in pool[:15]}
        result = build_daily_sangha(user, pool, previously_seen_ids=seen_ids, user_action_count=20)
        result_ids = {s.profile.user_id for s in result.candidates}
        # Fresh profiles should dominate; at most 5 seen ones re-appear
        seen_in_result = result_ids & seen_ids
        assert len(seen_in_result) <= 5 or len(pool) - len(seen_ids) < 10

    def test_candidates_sorted_by_score_descending(self):
        user = _make_female(user_id="requester", joined_days_ago=30)
        pool = self._build_pool(20)
        result = build_daily_sangha(user, pool, user_action_count=15)
        scores = [s.score for s in result.candidates]
        assert scores == sorted(scores, reverse=True)

    def test_result_contains_eligible_pool_size(self):
        user = _make_female(user_id="requester", joined_days_ago=30)
        pool = self._build_pool(20)
        result = build_daily_sangha(user, pool, user_action_count=15)
        assert result.eligible_pool_size >= 0
        assert result.total_candidate_pool == len(pool)


# ---------------------------------------------------------------------------
# Feedback Signal Tests
# ---------------------------------------------------------------------------

class TestFeedbackSignals:

    def test_gold_label_has_highest_strength(self):
        assert SIGNAL_STRENGTH[SignalType.RELATIONSHIP_REPORTED] == 1.0

    def test_profile_view_weakest_positive_signal(self):
        positive = {k: v for k, v in SIGNAL_STRENGTH.items() if v > 0}
        weakest = min(positive, key=positive.get)
        assert weakest == SignalType.PROFILE_VIEWED

    def test_prompt_policy_requires_min_messages(self):
        policy = FeedbackPromptPolicy()
        assert not policy.should_prompt(
            thread_message_count=5,  # below threshold of 10
            thread_age_days=20,
            days_since_last_prompt=60,
            prompts_sent_this_month=0,
        )

    def test_prompt_policy_respects_cooldown(self):
        policy = FeedbackPromptPolicy()
        assert not policy.should_prompt(
            thread_message_count=15,
            thread_age_days=20,
            days_since_last_prompt=10,  # within 30-day cooldown
            prompts_sent_this_month=0,
        )

    def test_prompt_policy_allows_when_all_conditions_met(self):
        policy = FeedbackPromptPolicy()
        assert policy.should_prompt(
            thread_message_count=15,
            thread_age_days=20,
            days_since_last_prompt=31,
            prompts_sent_this_month=0,
        )
