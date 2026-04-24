"""
Oneness Scoring Engine — Hard Filters (Phase 1)

Hard filters eliminate candidates before any soft scoring occurs.
A candidate that fails any hard filter never enters the ranked pool.
These are non-negotiable, bidirectional constraints.
"""

from __future__ import annotations
from dataclasses import dataclass

from oneness.models.user_profile import UserProfile
from oneness.scoring.config import (
    DEFAULT_MAX_DISTANCE_KM,
    PILOT_IE_GATE,
)


@dataclass
class FilterResult:
    passed: bool
    reason: str = ""  # populated when passed=False, useful for debugging


def _gender_match(user: UserProfile, candidate: UserProfile) -> FilterResult:
    """Bidirectional: user must want candidate's gender AND candidate must want user's gender."""
    user_wants_candidate = user.interested_in_gender == candidate.gender
    candidate_wants_user = candidate.interested_in_gender == user.gender

    if not user_wants_candidate:
        return FilterResult(False, f"user not interested in {candidate.gender}")
    if not candidate_wants_user:
        return FilterResult(False, f"candidate not interested in {user.gender}")
    return FilterResult(True)


def _height_range_filter(user: UserProfile, candidate: UserProfile) -> FilterResult:
    """Candidate must fall within the user's stated height range preference.
    Only enforced when the user has explicitly set a minimum or maximum."""
    if candidate.height_cm > 0:
        if user.min_height_cm > 0 and candidate.height_cm < user.min_height_cm:
            return FilterResult(
                False,
                f"candidate height {candidate.height_cm}cm below user minimum {user.min_height_cm}cm"
            )
        if user.max_height_cm > 0 and candidate.height_cm > user.max_height_cm:
            return FilterResult(
                False,
                f"candidate height {candidate.height_cm}cm above user maximum {user.max_height_cm}cm"
            )
    return FilterResult(True)


def _location_filter(user: UserProfile, candidate: UserProfile) -> FilterResult:
    """Candidate must be within DEFAULT_MAX_DISTANCE_KM of the user.
    distance_km must be pre-computed and set on the candidate object before filtering."""
    if candidate.distance_km is None:
        return FilterResult(False, "candidate distance not computed")
    if candidate.distance_km > DEFAULT_MAX_DISTANCE_KM:
        return FilterResult(
            False,
            f"distance {candidate.distance_km:.1f}km exceeds max {DEFAULT_MAX_DISTANCE_KM}km"
        )
    return FilterResult(True)


def _spiritual_gate_filter(user: UserProfile, candidate: UserProfile) -> FilterResult:
    """Pilot gate: both user and candidate must have a qualifying IE status.
    This is what ensures Oneness serves the Isha community exclusively."""
    if candidate.spiritual.ie_status not in PILOT_IE_GATE:
        return FilterResult(
            False,
            f"candidate IE status '{candidate.spiritual.ie_status}' does not meet pilot gate"
        )
    return FilterResult(True)


def _active_subscription_filter(user: UserProfile, candidate: UserProfile) -> FilterResult:
    """Only show candidates who are active subscribers and have active accounts."""
    if not candidate.subscription_active:
        return FilterResult(False, "candidate subscription not active")
    if not candidate.is_active:
        return FilterResult(False, "candidate account not active")
    return FilterResult(True)


def _profile_complete_filter(user: UserProfile, candidate: UserProfile) -> FilterResult:
    """Never show an incomplete profile — protects UX quality."""
    if not candidate.is_profile_complete():
        return FilterResult(False, "candidate profile incomplete")
    return FilterResult(True)


# Ordered list of all hard filters. All must pass.
# Age bucket is intentionally NOT here — it is a soft scoring signal.
# The only demographic hard filter is gender preference match.
HARD_FILTER_PIPELINE: list = [
    _active_subscription_filter,
    _profile_complete_filter,
    _spiritual_gate_filter,
    _gender_match,
    _height_range_filter,
    _location_filter,
]


def apply_hard_filters(
    user: UserProfile,
    candidates: list[UserProfile],
    debug: bool = False,
) -> list[UserProfile]:
    """Apply all hard filters to a candidate pool.

    Returns only the candidates that pass every filter.
    If debug=True, prints eliminated candidates and their reasons.
    """
    passed: list[UserProfile] = []

    for candidate in candidates:
        if candidate.user_id == user.user_id:
            continue  # never show a user their own profile

        elimination_reason: str | None = None
        for filter_fn in HARD_FILTER_PIPELINE:
            result = filter_fn(user, candidate)
            if not result.passed:
                elimination_reason = result.reason
                break

        if elimination_reason is None:
            passed.append(candidate)
        elif debug:
            print(f"[FILTERED OUT] {candidate.user_id}: {elimination_reason}")

    return passed
