"""
Oneness Scoring Engine — Configuration

All tunable constants live here. Nothing is hardcoded in scoring logic.
Phase 1: Rule-based weights. Phase 2+: these become priors for learned weights.
"""

from __future__ import annotations
from enum import Enum
from dataclasses import dataclass, field


# ---------------------------------------------------------------------------
# Age Buckets
# Previous definition had 36 appearing in two buckets (31-36 and 36-42).
# Fixed: buckets are now non-overlapping closed intervals.
# ---------------------------------------------------------------------------

AGE_BUCKETS: list[tuple[int, int]] = [
    (18, 23),
    (24, 30),
    (31, 36),
    (37, 42),
    (43, 50),
]

# Age bucket is a SOFT grouping signal, not a hard filter.
# Gap of 0 = same bucket (full score), gap of 1 = adjacent (partial),
# gap of 2 = two apart (low score), gap >= 3 = floors to 0.
# The user selects which age brackets they're open to — stored as
# preferred_age_bucket_indices on their profile.
AGE_BUCKET_MAX_GAP = 2  # allows cross-bucket matches with score penalty


# ---------------------------------------------------------------------------
# Looking For options
# All four options are available. The engine applies a soft penalty for large
# intent gaps (e.g. DATE_TO_MARRY_SOON paired with SHORT_TERM).
# ---------------------------------------------------------------------------

class LookingFor(str, Enum):
    DATE_TO_MARRY_SOON = "date_to_marry_soon"  # highest intent
    DATE_TO_MARRY = "date_to_marry"            # high intent
    LONG_TERM = "long_term"                    # medium intent
    SHORT_TERM = "short_term"                  # lowest intent

# Intent ordering — used to compute mismatch penalty.
# Distance between two users on this scale affects their soft score.
LOOKING_FOR_INTENT_ORDER: list[LookingFor] = [
    LookingFor.DATE_TO_MARRY_SOON,
    LookingFor.DATE_TO_MARRY,
    LookingFor.LONG_TERM,
    LookingFor.SHORT_TERM,
]

# Maximum allowed intent gap before a hard penalty is applied.
# Gap of 0 = identical intent (full score). Gap of 1 = one step (partial).
# Gap of 3 = e.g. "marry soon" paired with "open to explore" — penalized.
LOOKING_FOR_MAX_SOFT_GAP = 1


# ---------------------------------------------------------------------------
# Spiritual Layer — Isha Pilot
# ---------------------------------------------------------------------------

class IshaPractice(str, Enum):
    SHAMBHAVI = "shambhavi_mahamudra"
    ISHA_KRIYA = "isha_kriya"
    SURYA_KRIYA = "surya_kriya"
    YOGASANAS = "yogasanas"
    BHUTA_SHUDDHI = "bhuta_shuddhi"
    CHANTING = "chanting"
    HATHA_YOGA = "hatha_yoga"
    GENERAL_MEDITATION = "general_meditation"

# Practice depth weights — more demanding practices signal deeper commitment.
# Shambhavi requires Inner Engineering + a retreat; it is the strongest signal.
PRACTICE_DEPTH_WEIGHTS: dict[IshaPractice, float] = {
    IshaPractice.SHAMBHAVI: 1.0,
    IshaPractice.SURYA_KRIYA: 0.85,
    IshaPractice.HATHA_YOGA: 0.80,
    IshaPractice.BHUTA_SHUDDHI: 0.75,
    IshaPractice.ISHA_KRIYA: 0.65,
    IshaPractice.YOGASANAS: 0.55,
    IshaPractice.CHANTING: 0.50,
    IshaPractice.GENERAL_MEDITATION: 0.40,
}

class DietType(str, Enum):
    SATTVIC = "sattvic"          # no onion/garlic, vegetarian
    VEGAN = "vegan"
    VEGETARIAN = "vegetarian"
    OCCASIONALLY_NON_VEG = "occasionally_non_veg"
    NON_VEG = "non_veg"

# Diet compatibility matrix — symmetric score [0.0, 1.0]
# Indexed as (user_diet, candidate_diet) → score
DIET_COMPAT: dict[tuple[DietType, DietType], float] = {
    (DietType.SATTVIC, DietType.SATTVIC): 1.0,
    (DietType.SATTVIC, DietType.VEGAN): 0.8,
    (DietType.SATTVIC, DietType.VEGETARIAN): 0.7,
    (DietType.SATTVIC, DietType.OCCASIONALLY_NON_VEG): 0.2,
    (DietType.SATTVIC, DietType.NON_VEG): 0.0,
    (DietType.VEGAN, DietType.VEGAN): 1.0,
    (DietType.VEGAN, DietType.SATTVIC): 0.8,
    (DietType.VEGAN, DietType.VEGETARIAN): 0.75,
    (DietType.VEGAN, DietType.OCCASIONALLY_NON_VEG): 0.1,
    (DietType.VEGAN, DietType.NON_VEG): 0.0,
    (DietType.VEGETARIAN, DietType.VEGETARIAN): 1.0,
    (DietType.VEGETARIAN, DietType.SATTVIC): 0.7,
    (DietType.VEGETARIAN, DietType.VEGAN): 0.75,
    (DietType.VEGETARIAN, DietType.OCCASIONALLY_NON_VEG): 0.3,
    (DietType.VEGETARIAN, DietType.NON_VEG): 0.1,
    (DietType.OCCASIONALLY_NON_VEG, DietType.OCCASIONALLY_NON_VEG): 1.0,
    (DietType.OCCASIONALLY_NON_VEG, DietType.NON_VEG): 0.8,
    (DietType.OCCASIONALLY_NON_VEG, DietType.VEGETARIAN): 0.3,
    (DietType.OCCASIONALLY_NON_VEG, DietType.SATTVIC): 0.2,
    (DietType.OCCASIONALLY_NON_VEG, DietType.VEGAN): 0.1,
    (DietType.NON_VEG, DietType.NON_VEG): 1.0,
    (DietType.NON_VEG, DietType.OCCASIONALLY_NON_VEG): 0.8,
    (DietType.NON_VEG, DietType.VEGETARIAN): 0.1,
    (DietType.NON_VEG, DietType.SATTVIC): 0.0,
    (DietType.NON_VEG, DietType.VEGAN): 0.0,
}

class CommitmentLevel(str, Enum):
    DEEPLY_COMMITTED = "deeply_committed"     # daily sadhana, retreats, programs
    REGULAR_PRACTITIONER = "regular"          # consistent practice, some programs
    CASUAL_PRACTITIONER = "casual"            # occasional, curious

COMMITMENT_COMPAT: dict[tuple[CommitmentLevel, CommitmentLevel], float] = {
    (CommitmentLevel.DEEPLY_COMMITTED, CommitmentLevel.DEEPLY_COMMITTED): 1.0,
    (CommitmentLevel.DEEPLY_COMMITTED, CommitmentLevel.REGULAR_PRACTITIONER): 0.65,
    (CommitmentLevel.DEEPLY_COMMITTED, CommitmentLevel.CASUAL_PRACTITIONER): 0.20,
    (CommitmentLevel.REGULAR_PRACTITIONER, CommitmentLevel.REGULAR_PRACTITIONER): 1.0,
    (CommitmentLevel.REGULAR_PRACTITIONER, CommitmentLevel.DEEPLY_COMMITTED): 0.65,
    (CommitmentLevel.REGULAR_PRACTITIONER, CommitmentLevel.CASUAL_PRACTITIONER): 0.55,
    (CommitmentLevel.CASUAL_PRACTITIONER, CommitmentLevel.CASUAL_PRACTITIONER): 1.0,
    (CommitmentLevel.CASUAL_PRACTITIONER, CommitmentLevel.REGULAR_PRACTITIONER): 0.55,
    (CommitmentLevel.CASUAL_PRACTITIONER, CommitmentLevel.DEEPLY_COMMITTED): 0.20,
}

# Inner Engineering completion is the pilot gate (hard filter).
# Shambhavi completion means IE was completed AND the retreat attended.
class IEStatus(str, Enum):
    COMPLETED_SHAMBHAVI = "completed_shambhavi"
    COMPLETED_IE = "completed_ie"
    IN_PROGRESS = "in_progress"
    NOT_DONE = "not_done"

# Pilot hard-filter gate: only these statuses pass for the Isha pilot.
PILOT_IE_GATE: set[IEStatus] = {
    IEStatus.COMPLETED_SHAMBHAVI,
    IEStatus.COMPLETED_IE,
    IEStatus.IN_PROGRESS,
}


# ---------------------------------------------------------------------------
# Soft Score Weights (Phase 1)
# All weights sum to 1.0. Adjust here as you gather signal data.
# ---------------------------------------------------------------------------

@dataclass
class ScoringWeights:
    age_bucket: float = 0.20
    looking_for: float = 0.20
    spiritual_depth: float = 0.20
    diet_compat: float = 0.10
    commitment_compat: float = 0.10
    location_proximity: float = 0.10
    height_compat: float = 0.05
    career_level: float = 0.03
    recency: float = 0.02

    def validate(self) -> None:
        total = sum(vars(self).values())
        if abs(total - 1.0) > 1e-6:
            raise ValueError(f"Weights must sum to 1.0, got {total:.4f}")

DEFAULT_WEIGHTS = ScoringWeights()


# ---------------------------------------------------------------------------
# Location
# ---------------------------------------------------------------------------

# Maximum distance (km) within which two users can match.
# Users beyond this radius are excluded by hard filter.
DEFAULT_MAX_DISTANCE_KM = 100

# Score decay: full score within NEAR_KM, linear decay to 0 at MAX_DISTANCE_KM
NEAR_KM = 20


# ---------------------------------------------------------------------------
# Sangha Queue
# ---------------------------------------------------------------------------

DAILY_SANGHA_SIZE = 10
SANGHA_REFRESH_HOURS = 24

# Number of mutual engagements (messages sent + replied) required before
# transitioning from Phase 1 (rule-based) to Phase 2 (collaborative filtering)
PHASE_2_THRESHOLD_ENGAGEMENTS = 500
