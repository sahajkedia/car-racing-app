"""
Pydantic schemas for profile create/update/read operations.
Mirrors the Supabase profiles table with validation.
"""
from __future__ import annotations
from datetime import date
from typing import Literal, Optional
from pydantic import BaseModel, Field, field_validator


GenderType = Literal["male", "female", "non_binary"]
LookingForType = Literal["date_to_marry_soon", "date_to_marry", "long_term", "short_term"]
IEStatusType = Literal["completed_shambhavi", "completed_ie", "in_progress", "not_done"]
CommitmentType = Literal["deeply_committed", "regular", "casual"]
DietType = Literal["sattvic", "vegan", "vegetarian", "occasionally_non_veg", "non_veg"]
OnboardingStep = Literal["photos", "basics", "location", "intent", "about", "spiritual", "complete"]

VALID_PRACTICES = {
    "shambhavi_mahamudra", "isha_kriya", "surya_kriya",
    "yogasanas", "bhuta_shuddhi", "chanting", "hatha_yoga", "general_meditation"
}

SALARY_BRACKETS = {"<5L", "5-10L", "10-20L", "20-40L", "40-80L", "80L+"}


# ── Read schema (returned to client) ────────────────────────────────────────

class PhotoOut(BaseModel):
    id: str
    url: str
    position: int


class ProfileOut(BaseModel):
    id: str
    name: str
    dob: date
    gender: GenderType
    city: str
    state: str
    looking_for: LookingForType
    height_cm: Optional[int] = None
    about_me: Optional[str] = None
    job_title: Optional[str] = None
    degree: Optional[str] = None
    ie_status: IEStatusType
    daily_practices: list[str]
    diet: DietType
    commitment_level: CommitmentType
    photos: list[PhotoOut] = []
    onboarding_step: OnboardingStep
    onboarding_complete: bool
    last_active_at: Optional[str] = None


# Thin version for the Sangha (never expose salary or subscription details)
class ProfileCard(BaseModel):
    id: str
    name: str
    age: int  # computed from dob
    gender: GenderType
    city: str
    height_cm: Optional[int] = None
    about_me: Optional[str] = None
    job_title: Optional[str] = None
    looking_for: LookingForType
    ie_status: IEStatusType
    daily_practices: list[str]
    diet: DietType
    commitment_level: CommitmentType
    photos: list[PhotoOut] = []
    compatibility_score: float = 0.0  # injected by matching engine


# ── Onboarding step schemas ──────────────────────────────────────────────────

class StepBasics(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    dob: date
    gender: GenderType
    interested_in_gender: GenderType

    @field_validator("dob")
    @classmethod
    def validate_age(cls, v: date) -> date:
        from datetime import date as d
        age = (d.today() - v).days // 365
        if not (18 <= age <= 50):
            raise ValueError("Age must be between 18 and 50")
        return v


class StepLocation(BaseModel):
    city: str = Field(..., min_length=1, max_length=100)
    state: str = Field(..., min_length=1, max_length=100)
    country: str = "India"
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class StepIntent(BaseModel):
    looking_for: LookingForType
    height_cm: int = Field(..., ge=100, le=250)
    min_height_cm: int = Field(default=0, ge=0, le=250)
    max_height_cm: int = Field(default=0, ge=0, le=250)
    preferred_age_buckets: list[int] = Field(default_factory=list)

    @field_validator("max_height_cm")
    @classmethod
    def max_gt_min(cls, v: int, info) -> int:
        min_h = info.data.get("min_height_cm", 0)
        if v > 0 and min_h > 0 and v < min_h:
            raise ValueError("max_height_cm must be >= min_height_cm")
        return v


class StepAbout(BaseModel):
    about_me: str = Field(..., min_length=1, max_length=300)
    job_title: Optional[str] = Field(None, max_length=100)
    degree: Optional[str] = Field(None, max_length=100)
    salary_bracket: Optional[str] = None

    @field_validator("salary_bracket")
    @classmethod
    def validate_salary(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in SALARY_BRACKETS:
            raise ValueError(f"salary_bracket must be one of {SALARY_BRACKETS}")
        return v


class StepSpiritual(BaseModel):
    ie_status: IEStatusType
    daily_practices: list[str] = Field(default_factory=list)
    diet: DietType
    commitment_level: CommitmentType

    @field_validator("daily_practices")
    @classmethod
    def validate_practices(cls, v: list[str]) -> list[str]:
        invalid = set(v) - VALID_PRACTICES
        if invalid:
            raise ValueError(f"Unknown practices: {invalid}")
        return v
