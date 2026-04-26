"""
Matching endpoint — generates the Daily Sangha for the authenticated user.

GET /matching/sangha
  → Returns the current 10-profile Sangha (creates a new one if expired/missing)

POST /matching/signal
  → Records a behavioral signal (profile_viewed, express_interest, silent_pass)
"""
from __future__ import annotations
import json
import math
import struct
from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.core.deps import get_current_user
from app.core.supabase_client import get_service_client

# Scoring engine imports (from oneness package in parent directory)
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../../../../"))

from oneness.models.user_profile import (
    UserProfile, Location, SpiritualProfile, CareerProfile,
)
from oneness.scoring.config import (
    CommitmentLevel, DietType, IEStatus, IshaPractice, LookingFor,
)
from oneness.scoring.ranking_engine import build_daily_sangha

router = APIRouter(prefix="/matching", tags=["matching"])
CurrentUser = Annotated[dict, Depends(get_current_user)]

SANGHA_TTL_HOURS = 24


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Great-circle distance between two (lat, lon) points in kilometres."""
    R = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def _parse_location(loc) -> tuple[float, float]:
    """Parse a Supabase location value (dict, JSON string, or PostGIS EWKB hex) to (lat, lon)."""
    if isinstance(loc, dict):
        return (loc.get("lat") or 0.0, loc.get("lng") or 0.0)
    if isinstance(loc, str):
        try:
            d = json.loads(loc)
            if isinstance(d, dict):
                return (d.get("lat") or 0.0, d.get("lng") or 0.0)
        except Exception:
            pass
        # PostGIS EWKB hex (e.g. "0101000020E6100000...")
        try:
            raw = bytes.fromhex(loc)
            bo = "<" if raw[0] == 1 else ">"
            wkb_type = struct.unpack(bo + "I", raw[1:5])[0]
            offset = 5
            if wkb_type & 0x20000000:  # SRID flag → skip 4 bytes
                offset += 4
            lon, lat = struct.unpack(bo + "dd", raw[offset:offset + 16])
            return (lat, lon)
        except Exception:
            pass
    return (0.0, 0.0)


def _row_to_profile(row: dict, user_lat: float | None, user_lon: float | None) -> UserProfile:
    """Convert a Supabase profiles row into a scoring engine UserProfile."""
    cand_lat, cand_lon = _parse_location(row.get("location"))

    distance_km = None
    if user_lat and user_lon and cand_lat and cand_lon:
        distance_km = _haversine_km(user_lat, user_lon, cand_lat, cand_lon)

    practices = []
    for p in (row.get("daily_practices") or []):
        try:
            practices.append(IshaPractice(p))
        except ValueError:
            pass

    last_active = None
    if row.get("last_active_at"):
        try:
            last_active = datetime.fromisoformat(row["last_active_at"])
        except Exception:
            pass

    joined = None
    if row.get("created_at"):
        try:
            joined = datetime.fromisoformat(row["created_at"])
        except Exception:
            pass

    from datetime import date
    dob_raw = row.get("dob", "2000-01-01")
    try:
        dob = date.fromisoformat(dob_raw)
    except Exception:
        dob = date(2000, 1, 1)

    return UserProfile(
        user_id=row["id"],
        name=row.get("name", ""),
        dob=dob,
        gender=row.get("gender", "male"),
        interested_in_gender=row.get("interested_in_gender", "female"),
        location=Location(
            city=row.get("city", ""),
            state=row.get("state", ""),
            country=row.get("country", "India"),
            latitude=cand_lat,
            longitude=cand_lon,
        ),
        looking_for=LookingFor(row.get("looking_for", "long_term")),
        height_cm=row.get("height_cm") or 0,
        min_height_cm=row.get("min_height_cm") or 0,
        max_height_cm=row.get("max_height_cm") or 0,
        about_me=row.get("about_me") or "",
        spiritual=SpiritualProfile(
            ie_status=IEStatus(row.get("ie_status", "not_done")),
            daily_practices=practices,
            diet=DietType(row.get("diet", "vegetarian")),
            commitment_level=CommitmentLevel(row.get("commitment_level", "casual")),
        ),
        career=CareerProfile(
            job_title=row.get("job_title") or "",
            degree=row.get("degree") or "",
            salary_bracket=row.get("salary_bracket"),
        ),
        photo_urls=[p["url"] for p in sorted(row.get("photos", []), key=lambda x: x["position"])],
        is_active=row.get("is_active", True),
        last_active_at=last_active,
        joined_at=joined,
        subscription_active=row.get("subscription_active", False),
        distance_km=distance_km,
    )


@router.get("/sangha")
async def get_sangha(user: CurrentUser):
    """Return the authenticated user's Daily Sangha (10 profiles).

    If a valid non-expired Sangha exists for today, return it cached.
    Otherwise, run the ranking engine and create a new Sangha session.
    """
    if not user["profile_id"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Complete onboarding before viewing your Sangha."
        )

    svc = get_service_client()
    profile_id = user["profile_id"]

    # Check for active (non-expired) Sangha session
    existing = svc.table("sangha_sessions").select("*") \
        .eq("viewer_id", profile_id) \
        .gt("expires_at", datetime.now(timezone.utc).isoformat()) \
        .order("created_at", desc=True) \
        .limit(1).execute()

    if existing.data:
        session = existing.data[0]
        # Fetch the profiles for the stored candidate IDs
        candidates = svc.table("profiles").select(
            "*, photos(id, url, position)"
        ).in_("id", session["candidate_ids"]).execute()

        # Re-attach scores from session
        score_map = dict(zip(session["candidate_ids"], session["scores"]))
        result = []
        for row in (candidates.data or []):
            row["compatibility_score"] = score_map.get(row["id"], 0.0)
            result.append(row)

        # Sort by score descending
        result.sort(key=lambda x: x["compatibility_score"], reverse=True)
        return {"sangha": result, "cached": True, "expires_at": session["expires_at"]}

    # No active session — run the ranking engine
    user_row = svc.table("profiles").select("*").eq("id", profile_id).single().execute()
    if not user_row.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found")

    user_profile = _row_to_profile(user_row.data, None, None)

    # Fetch candidate pool (all active, complete, subscribed profiles)
    candidates_raw = svc.table("profiles").select(
        "*, photos(id, url, position)"
    ).eq("is_active", True) \
     .eq("onboarding_complete", True) \
     .eq("subscription_active", True) \
     .neq("id", profile_id) \
     .execute()

    # Convert rows to UserProfile objects with distances
    ulat, ulon = _parse_location(user_row.data.get("location"))

    candidate_profiles = [
        _row_to_profile(row, ulat, ulon)
        for row in (candidates_raw.data or [])
    ]

    # Count user actions (for cold start detection)
    action_count_resp = svc.table("signals") \
        .select("id", count="exact") \
        .eq("from_profile_id", profile_id) \
        .execute()
    action_count = action_count_resp.count or 0

    # Previously seen profile IDs
    prev_sessions = svc.table("sangha_sessions") \
        .select("candidate_ids") \
        .eq("viewer_id", profile_id) \
        .order("created_at", desc=True) \
        .limit(3).execute()

    seen_ids: set[str] = set()
    for sess in (prev_sessions.data or []):
        seen_ids.update(sess.get("candidate_ids") or [])

    # Run ranking engine
    result = build_daily_sangha(
        user=user_profile,
        candidate_pool=candidate_profiles,
        user_action_count=action_count,
        previously_seen_ids=seen_ids,
    )

    if not result.candidates:
        return {"sangha": [], "cached": False, "message": "No compatible profiles found yet. Invite friends!"}

    candidate_ids = [c.profile.user_id for c in result.candidates]
    scores = [c.score for c in result.candidates]

    # Persist Sangha session (for caching and MLOps signal attribution)
    svc.table("sangha_sessions").insert({
        "viewer_id": profile_id,
        "candidate_ids": candidate_ids,
        "scores": scores,
        "weights_snapshot": json.loads(json.dumps(vars(result.weights_used))),
        "is_cold_start": result.is_cold_start,
    }).execute()

    # Fetch full profile rows for the ranked candidates
    ranked_rows = svc.table("profiles").select(
        "id, name, dob, gender, city, height_cm, about_me, job_title, "
        "looking_for, ie_status, daily_practices, diet, commitment_level, "
        "last_active_at, photos(id, url, position)"
    ).in_("id", candidate_ids).execute()

    score_map = dict(zip(candidate_ids, scores))
    sangha = []
    for row in (ranked_rows.data or []):
        row["compatibility_score"] = score_map.get(row["id"], 0.0)
        sangha.append(row)

    sangha.sort(key=lambda x: x["compatibility_score"], reverse=True)

    return {
        "sangha": sangha,
        "cached": False,
        "is_cold_start": result.is_cold_start,
        "eligible_pool_size": result.eligible_pool_size,
    }


# ── Signal logging ───────────────────────────────────────────────────────────

class SignalRequest(BaseModel):
    to_profile_id: str
    signal_type: str  # profile_viewed | express_interest | silent_pass
    session_id: str | None = None
    metadata: dict = {}


ALLOWED_CLIENT_SIGNALS = {"profile_viewed", "express_interest", "silent_pass"}


@router.post("/signal", status_code=status.HTTP_201_CREATED)
async def log_signal(user: CurrentUser, body: SignalRequest):
    """Log a behavioral signal from the user."""
    if not user["profile_id"]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Complete onboarding first.")

    if body.signal_type not in ALLOWED_CLIENT_SIGNALS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"signal_type must be one of {ALLOWED_CLIENT_SIGNALS}"
        )

    svc = get_service_client()
    svc.table("signals").insert({
        "from_profile_id": user["profile_id"],
        "to_profile_id": body.to_profile_id,
        "signal_type": body.signal_type,
        "session_id": body.session_id,
        "metadata": body.metadata,
    }).execute()

    return {"logged": True}
