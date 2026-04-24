"""
Oneness — UserProfile data model

This is the canonical representation of a user as the scoring engine sees them.
It is intentionally decoupled from the database ORM and the API layer.
"""

from __future__ import annotations
from dataclasses import dataclass, field
from datetime import date, datetime
from typing import Optional

from oneness.scoring.config import (
    CommitmentLevel,
    DietType,
    IEStatus,
    IshaPractice,
    LookingFor,
)


class Gender(str):
    MALE = "male"
    FEMALE = "female"
    NON_BINARY = "non_binary"


@dataclass
class Location:
    city: str
    state: str
    country: str = "India"
    latitude: float = 0.0
    longitude: float = 0.0


@dataclass
class SpiritualProfile:
    """Captures the spiritual differentiation layer — the signals that make
    Oneness different from a generic dating app."""

    ie_status: IEStatus = IEStatus.NOT_DONE
    daily_practices: list[IshaPractice] = field(default_factory=list)
    diet: DietType = DietType.VEGETARIAN
    commitment_level: CommitmentLevel = CommitmentLevel.CASUAL_PRACTITIONER

    @property
    def depth_score(self) -> float:
        """Aggregate spiritual depth [0.0, 1.0] from daily practices.
        Uses the max practice weight (not the sum) to avoid penalising
        users who only have one demanding practice like Shambhavi."""
        from oneness.scoring.config import PRACTICE_DEPTH_WEIGHTS

        if not self.daily_practices:
            return 0.0
        return max(
            PRACTICE_DEPTH_WEIGHTS.get(p, 0.0) for p in self.daily_practices
        )


@dataclass
class CareerProfile:
    job_title: str = ""
    degree: str = ""
    salary_bracket: Optional[str] = None  # e.g. "10-20L", "20-40L", "40-80L", "80L+"


@dataclass
class UserProfile:
    """Full user profile as seen by the scoring engine.

    Fields are populated from the onboarding flow. Optional fields may be
    absent for users who skipped non-mandatory screens (only photos + about_me
    + spiritual gate are mandatory for the Isha pilot).
    """

    user_id: str
    name: str
    dob: date
    gender: str
    interested_in_gender: str                 # hard filter field
    location: Location

    # Onboarding answers
    looking_for: LookingFor = LookingFor.LONG_TERM
    height_cm: int = 0                        # user's own height
    min_height_cm: int = 0                    # lower bound of height range preference
    max_height_cm: int = 0                    # upper bound (0 = no upper limit)
    preferred_age_bucket_indices: list[int] = field(default_factory=list)
    # Which age buckets the user is open to (indices into AGE_BUCKETS).
    # Empty list = open to all buckets within AGE_BUCKET_MAX_GAP of their own.

    about_me: str = ""                        # max 300 chars, mandatory
    spiritual: SpiritualProfile = field(default_factory=SpiritualProfile)
    career: CareerProfile = field(default_factory=CareerProfile)

    # Photos
    photo_urls: list[str] = field(default_factory=list)   # 3 min, 9 max

    # Account state
    is_active: bool = True
    last_active_at: Optional[datetime] = None
    joined_at: Optional[datetime] = None
    subscription_active: bool = False

    # Computed at query time — not stored
    distance_km: Optional[float] = None

    @property
    def age(self) -> int:
        today = date.today()
        return (
            today.year - self.dob.year
            - ((today.month, today.day) < (self.dob.month, self.dob.day))
        )

    @property
    def age_bucket_index(self) -> int:
        """Returns the index of this user's age bucket in AGE_BUCKETS, or -1
        if the user's age is outside all defined buckets."""
        from oneness.scoring.config import AGE_BUCKETS

        for i, (lo, hi) in enumerate(AGE_BUCKETS):
            if lo <= self.age <= hi:
                return i
        return -1

    def is_profile_complete(self) -> bool:
        """Minimum viable profile: photos, bio, and spiritual gate filled."""
        return (
            len(self.photo_urls) >= 3
            and len(self.about_me.strip()) > 0
            and self.spiritual.ie_status != IEStatus.NOT_DONE
            and self.height_cm > 0
        )
