"""
Oneness Scoring Engine — Soft Scorer (Phase 1)

Computes a [0.0, 1.0] compatibility score for a (user, candidate) pair.
Called only after all hard filters pass.

Each sub-score is independently bounded to [0.0, 1.0].
The final score is the weighted sum per ScoringWeights in config.py.
"""

from __future__ import annotations
import math
from datetime import datetime, timezone

from oneness.models.user_profile import UserProfile
from oneness.scoring.config import (
    AGE_BUCKETS,
    AGE_BUCKET_MAX_GAP,
    COMMITMENT_COMPAT,
    DEFAULT_WEIGHTS,
    DIET_COMPAT,
    LOOKING_FOR_INTENT_ORDER,
    LOOKING_FOR_MAX_SOFT_GAP,
    NEAR_KM,
    DEFAULT_MAX_DISTANCE_KM,
    ScoringWeights,
)


def _age_bucket_score(user: UserProfile, candidate: UserProfile) -> float:
    """1.0 for same bucket, decays linearly with bucket gap."""
    gap = abs(user.age_bucket_index - candidate.age_bucket_index)
    if gap == 0:
        return 1.0
    if gap == 1:
        return 0.5
    return 0.0


def _looking_for_score(user: UserProfile, candidate: UserProfile) -> float:
    """Score based on intent alignment. Penalises large gaps in commitment level."""
    try:
        u_idx = LOOKING_FOR_INTENT_ORDER.index(user.looking_for)
        c_idx = LOOKING_FOR_INTENT_ORDER.index(candidate.looking_for)
    except ValueError:
        return 0.5  # unknown value — neutral

    gap = abs(u_idx - c_idx)
    if gap == 0:
        return 1.0
    if gap <= LOOKING_FOR_MAX_SOFT_GAP:
        return 0.6
    if gap == 2:
        return 0.2
    return 0.0  # gap of 3 — marry soon vs open to explore


def _spiritual_depth_score(user: UserProfile, candidate: UserProfile) -> float:
    """Average of both users' depth scores. Both must be spiritually engaged
    for this score to be high — one deeply committed person paired with a
    casual practitioner scores in the middle, not at the top."""
    u_depth = user.spiritual.depth_score
    c_depth = candidate.spiritual.depth_score
    return (u_depth + c_depth) / 2.0


def _diet_compat_score(user: UserProfile, candidate: UserProfile) -> float:
    """Look up the diet compatibility matrix (both directions, take the minimum)."""
    u_diet = user.spiritual.diet
    c_diet = candidate.spiritual.diet

    fwd = DIET_COMPAT.get((u_diet, c_diet), 0.5)
    rev = DIET_COMPAT.get((c_diet, u_diet), 0.5)
    return min(fwd, rev)  # conservative — take the more restrictive party's view


def _commitment_compat_score(user: UserProfile, candidate: UserProfile) -> float:
    u_level = user.spiritual.commitment_level
    c_level = candidate.spiritual.commitment_level
    return COMMITMENT_COMPAT.get((u_level, c_level), 0.5)


def _location_score(user: UserProfile, candidate: UserProfile) -> float:
    """Linear decay from 1.0 at 0km to 0.0 at DEFAULT_MAX_DISTANCE_KM."""
    if candidate.distance_km is None:
        return 0.0
    d = candidate.distance_km
    if d <= NEAR_KM:
        return 1.0
    if d >= DEFAULT_MAX_DISTANCE_KM:
        return 0.0
    return 1.0 - (d - NEAR_KM) / (DEFAULT_MAX_DISTANCE_KM - NEAR_KM)


def _height_compat_score(user: UserProfile, candidate: UserProfile) -> float:
    """Rewards candidates who fall comfortably within the user's height range.
    Hard filter already removed out-of-range candidates, so this scores
    how well the candidate fits within the preferred window."""
    if candidate.height_cm <= 0:
        return 0.5  # height not provided — neutral
    has_min = user.min_height_cm > 0
    has_max = user.max_height_cm > 0

    if not has_min and not has_max:
        return 0.5  # no preference stated — neutral

    # Score: 1.0 if in the ideal middle of the range, decays toward edges
    if has_min and has_max:
        midpoint = (user.min_height_cm + user.max_height_cm) / 2
        half_range = (user.max_height_cm - user.min_height_cm) / 2
        if half_range == 0:
            return 1.0
        distance_from_mid = abs(candidate.height_cm - midpoint)
        return max(0.0, 1.0 - (distance_from_mid / half_range) * 0.5)

    # Only min provided: full score if comfortably above, partial if near minimum
    surplus = candidate.height_cm - user.min_height_cm
    if surplus >= 15:
        return 1.0
    if surplus >= 5:
        return 0.75
    return 0.5


def _career_level_score(user: UserProfile, candidate: UserProfile) -> float:
    """Low-weight signal. Returns 1.0 if both have careers, 0.5 otherwise.
    Phase 2 will use salary brackets more precisely once we have signal data
    on whether salary similarity actually correlates with engagement."""
    has_career = bool(user.career.job_title and candidate.career.job_title)
    return 1.0 if has_career else 0.5


def _recency_score(user: UserProfile, candidate: UserProfile) -> float:
    """Decays if the candidate hasn't been active recently.
    Protects users from seeing ghost profiles."""
    if candidate.last_active_at is None:
        return 0.0
    now = datetime.now(timezone.utc)
    last_active = candidate.last_active_at
    if last_active.tzinfo is None:
        last_active = last_active.replace(tzinfo=timezone.utc)

    days_inactive = (now - last_active).days
    if days_inactive <= 1:
        return 1.0
    if days_inactive <= 7:
        return 0.75
    if days_inactive <= 30:
        return 0.4
    return 0.1  # very stale but not hard-filtered (subscription still active)


# -----------------------------------------------------------------------
# Sub-scorer registry — maps weight field name → scoring function
# -----------------------------------------------------------------------

_SCORERS: dict[str, callable] = {
    "age_bucket": _age_bucket_score,
    "looking_for": _looking_for_score,
    "spiritual_depth": _spiritual_depth_score,
    "diet_compat": _diet_compat_score,
    "commitment_compat": _commitment_compat_score,
    "location_proximity": _location_score,
    "height_compat": _height_compat_score,
    "career_level": _career_level_score,
    "recency": _recency_score,
}


def compute_soft_score(
    user: UserProfile,
    candidate: UserProfile,
    weights: ScoringWeights = DEFAULT_WEIGHTS,
) -> float:
    """Compute weighted compatibility score in [0.0, 1.0].

    Returns a float rounded to 4 decimal places. The score is NOT shown
    to users — it is only used to rank the candidate pool internally.
    """
    weights.validate()
    weight_dict = vars(weights)
    total_score = 0.0

    for field_name, scorer_fn in _SCORERS.items():
        sub_score = scorer_fn(user, candidate)
        weight = weight_dict[field_name]
        total_score += sub_score * weight

    return round(min(max(total_score, 0.0), 1.0), 4)


def score_breakdown(
    user: UserProfile,
    candidate: UserProfile,
    weights: ScoringWeights = DEFAULT_WEIGHTS,
) -> dict[str, float]:
    """Return per-dimension scores for debugging and model introspection.
    Useful during Phase 1 to understand which signals drive rankings."""
    breakdown: dict[str, float] = {}
    weight_dict = vars(weights)

    for field_name, scorer_fn in _SCORERS.items():
        raw = scorer_fn(user, candidate)
        weighted = raw * weight_dict[field_name]
        breakdown[field_name] = {"raw": round(raw, 4), "weighted": round(weighted, 4)}

    breakdown["total"] = compute_soft_score(user, candidate, weights)
    return breakdown
