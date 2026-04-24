"""
Oneness Scoring Engine — Cold Start Handler

Cold start problem: a new user has zero behavioral data (no messages sent,
no engagements, no implicit signals). The scoring engine cannot rely on
collaborative filtering or learned weights. This module defines the strategy
for handling new users in Phase 1.

Cold start applies when:
  - The user joined < COLD_START_WINDOW_DAYS ago, AND
  - The user has < COLD_START_MIN_ACTIONS actions recorded

Cold start exits when EITHER condition is no longer met.
"""

from __future__ import annotations
from datetime import date, datetime, timedelta, timezone
from dataclasses import dataclass, field

from oneness.models.user_profile import UserProfile
from oneness.scoring.config import (
    CommitmentLevel,
    IEStatus,
    ScoringWeights,
)


# A user is "cold" for this many days after joining
COLD_START_WINDOW_DAYS = 14

# A user exits cold start after this many actions (messages sent OR profiles viewed)
COLD_START_MIN_ACTIONS = 10


def is_cold_start_user(user: UserProfile, action_count: int = 0) -> bool:
    """Returns True if this user should be handled by cold start logic."""
    if user.joined_at is None:
        return True

    joined_at = user.joined_at
    if joined_at.tzinfo is None:
        joined_at = joined_at.replace(tzinfo=timezone.utc)

    days_since_join = (datetime.now(timezone.utc) - joined_at).days
    in_window = days_since_join < COLD_START_WINDOW_DAYS
    has_few_actions = action_count < COLD_START_MIN_ACTIONS

    return in_window and has_few_actions


def cold_start_weights(user: UserProfile) -> ScoringWeights:
    """Return adjusted scoring weights for a cold start user.

    For a new user we have no behavioral data to validate whether our
    soft scores predict good outcomes. We therefore:
    1. Up-weight signals that are objective and stable (spiritual alignment,
       location proximity, intent alignment).
    2. Down-weight signals that benefit from behavioral context (recency
       is less meaningful for profiles a cold user has never seen before;
       career similarity hasn't been validated as a predictor yet).

    These weights are a prior — they get replaced by learned weights in Phase 2.
    """
    return ScoringWeights(
        age_bucket=0.20,
        looking_for=0.22,        # intent match is extra important for serious seekers
        spiritual_depth=0.22,    # the app's core differentiator
        diet_compat=0.12,        # lifestyle compatibility matters early
        commitment_compat=0.12,  # depth of path alignment
        location_proximity=0.08,
        height_compat=0.02,
        career_level=0.01,
        recency=0.01,
    )


@dataclass
class ColdStartStrategy:
    """Encapsulates the full cold start approach for Oneness Phase 1.

    The strategy has three components:
    1. Adjusted weights (above)
    2. Profile diversity injection — ensure the first sangha contains
       varied spiritual depth levels so the engine can observe which
       profiles the user engages with
    3. Fallback pool — if the eligible pool is too small after hard filters,
       expand the location radius progressively
    """

    max_distance_km_steps: list[int] = field(
        default_factory=lambda: [100, 250, 500]
    )
    diversity_buckets: int = 3  # inject profiles from N commitment-level groups

    def get_weights(self, user: UserProfile) -> ScoringWeights:
        return cold_start_weights(user)

    def expand_pool_if_needed(
        self,
        user: UserProfile,
        filtered_candidates: list[UserProfile],
        min_pool_size: int = 30,
        current_radius_km: int = 100,
    ) -> tuple[int, str]:
        """If the eligible pool after hard filters is smaller than min_pool_size,
        suggest an expanded search radius.

        Returns (new_radius_km, reason). The caller is responsible for re-querying
        candidates with the new radius.
        """
        if len(filtered_candidates) >= min_pool_size:
            return current_radius_km, "pool sufficient"

        for radius in self.max_distance_km_steps:
            if radius > current_radius_km:
                return radius, f"pool too small ({len(filtered_candidates)}), expanding to {radius}km"

        return self.max_distance_km_steps[-1], "maximum radius reached"

    def inject_diversity(
        self,
        candidates: list[UserProfile],
        final_count: int = 10,
    ) -> list[UserProfile]:
        """Ensure the Daily Sangha for a cold start user contains a spread
        of spiritual commitment levels, not just the top-scored tier.

        This lets the engine observe user behaviour across the spectrum and
        calibrate future rankings. Without diversity injection, a new user
        who happens to be scored at the top by rule-based weights would
        only ever see deeply-committed profiles — even if they would have
        better real-world outcomes with regular practitioners.

        Strategy:
        - Bucket candidates by CommitmentLevel
        - Sample proportionally, favouring higher-scored candidates within
          each bucket
        - Fill remaining slots with top overall scores
        """
        if len(candidates) <= final_count:
            return candidates

        buckets: dict[CommitmentLevel, list[UserProfile]] = {
            level: [] for level in CommitmentLevel
        }
        for c in candidates:
            buckets[c.spiritual.commitment_level].append(c)

        # Target: ~40% deeply committed, ~40% regular, ~20% casual
        # (biased toward higher commitment levels for this community)
        targets = {
            CommitmentLevel.DEEPLY_COMMITTED: max(1, int(final_count * 0.4)),
            CommitmentLevel.REGULAR_PRACTITIONER: max(1, int(final_count * 0.4)),
            CommitmentLevel.CASUAL_PRACTITIONER: max(0, int(final_count * 0.2)),
        }

        selected: list[UserProfile] = []
        for level, target_n in targets.items():
            bucket = buckets[level]
            selected.extend(bucket[:target_n])  # assumes candidates are pre-sorted by score

        # Fill any remaining slots with the highest-scored candidates not yet selected
        selected_ids = {c.user_id for c in selected}
        remaining = [c for c in candidates if c.user_id not in selected_ids]
        selected.extend(remaining[: final_count - len(selected)])

        return selected[:final_count]
