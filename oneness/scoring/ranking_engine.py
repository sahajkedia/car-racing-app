"""
Oneness Scoring Engine — Ranking Engine (Phase 1)

Entry point for the Daily Sangha generation pipeline.

Pipeline:
  1. Apply hard filters to eliminate ineligible candidates
  2. Detect cold start and select appropriate weights
  3. Compute soft score for each eligible candidate
  4. Apply cold start diversity injection if needed
  5. Return top DAILY_SANGHA_SIZE candidates as the ranked queue

This module is stateless — all state (user profiles, action counts,
previous sangha history) is injected by the caller.
"""

from __future__ import annotations
from dataclasses import dataclass

from oneness.models.user_profile import UserProfile
from oneness.scoring.config import (
    DAILY_SANGHA_SIZE,
    DEFAULT_WEIGHTS,
    ScoringWeights,
)
from oneness.scoring.hard_filters import apply_hard_filters
from oneness.scoring.soft_scorer import compute_soft_score, score_breakdown
from oneness.scoring.cold_start import (
    ColdStartStrategy,
    is_cold_start_user,
    cold_start_weights,
)


@dataclass
class ScoredCandidate:
    profile: UserProfile
    score: float
    breakdown: dict | None = None  # populated only in debug mode


@dataclass
class SanghaResult:
    """Output of one ranking engine run — the user's Daily Sangha."""
    user_id: str
    candidates: list[ScoredCandidate]
    is_cold_start: bool
    weights_used: ScoringWeights
    eligible_pool_size: int   # how many candidates passed hard filters
    total_candidate_pool: int # how many candidates were considered before filtering
    expanded_radius_km: int | None = None  # set if cold start radius expansion occurred


def build_daily_sangha(
    user: UserProfile,
    candidate_pool: list[UserProfile],
    user_action_count: int = 0,
    previously_seen_ids: set[str] | None = None,
    debug: bool = False,
) -> SanghaResult:
    """Generate the Daily Sangha for a given user.

    Args:
        user: The requesting user's profile.
        candidate_pool: All candidate profiles to rank (pre-fetched from DB,
            with distance_km already set on each candidate).
        user_action_count: Total actions (messages sent + profiles viewed) this
            user has taken. Used to detect cold start.
        previously_seen_ids: Profile IDs shown to this user in prior sessions.
            Excluded from ranking unless the pool is too small.
        debug: If True, attach per-dimension score breakdowns to each result.

    Returns:
        SanghaResult with up to DAILY_SANGHA_SIZE ranked candidates.
    """
    previously_seen_ids = previously_seen_ids or set()
    total_pool_size = len(candidate_pool)

    # Step 1: Hard filters
    eligible = apply_hard_filters(user, candidate_pool, debug=debug)

    # Step 2: Exclude previously seen profiles (prefer fresh faces)
    fresh = [c for c in eligible if c.user_id not in previously_seen_ids]
    if len(fresh) < DAILY_SANGHA_SIZE:
        # Not enough fresh candidates — allow some repeat profiles
        seen_recycled = [c for c in eligible if c.user_id in previously_seen_ids]
        fresh = fresh + seen_recycled

    # Step 3: Cold start detection and weight selection
    cold_start = is_cold_start_user(user, action_count=user_action_count)
    weights = cold_start_weights(user) if cold_start else DEFAULT_WEIGHTS

    # Step 4: Radius expansion for cold start users with thin pools
    expanded_radius = None
    if cold_start and len(fresh) < DAILY_SANGHA_SIZE * 3:
        strategy = ColdStartStrategy()
        new_radius, reason = strategy.expand_pool_if_needed(
            user, fresh, min_pool_size=DAILY_SANGHA_SIZE * 3
        )
        if new_radius != 100:
            expanded_radius = new_radius
            if debug:
                print(f"[COLD START] {reason}")

    # Step 5: Soft score all eligible candidates
    scored: list[ScoredCandidate] = []
    for candidate in fresh:
        score = compute_soft_score(user, candidate, weights)
        breakdown = score_breakdown(user, candidate, weights) if debug else None
        scored.append(ScoredCandidate(profile=candidate, score=score, breakdown=breakdown))

    scored.sort(key=lambda x: x.score, reverse=True)

    # Step 6: Cold start diversity injection
    if cold_start and len(scored) > DAILY_SANGHA_SIZE:
        strategy = ColdStartStrategy()
        top_profiles = strategy.inject_diversity(
            [s.profile for s in scored],
            final_count=DAILY_SANGHA_SIZE,
        )
        top_ids = {p.user_id for p in top_profiles}
        final = [s for s in scored if s.profile.user_id in top_ids][:DAILY_SANGHA_SIZE]
    else:
        final = scored[:DAILY_SANGHA_SIZE]

    return SanghaResult(
        user_id=user.user_id,
        candidates=final,
        is_cold_start=cold_start,
        weights_used=weights,
        eligible_pool_size=len(eligible),
        total_candidate_pool=total_pool_size,
        expanded_radius_km=expanded_radius,
    )
