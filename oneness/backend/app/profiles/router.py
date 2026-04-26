"""
Profile endpoints — onboarding steps + photo upload + read.

Onboarding is step-by-step. The frontend sends one step at a time.
Photos come FIRST (step 1) per product requirement.

Steps:
  POST /profiles/onboarding/photos     → upload 3-9 photos
  POST /profiles/onboarding/basics     → name, dob, gender, interested_in
  POST /profiles/onboarding/location   → city/town
  POST /profiles/onboarding/intent     → looking_for, height, height range
  POST /profiles/onboarding/about      → about_me, career, salary
  POST /profiles/onboarding/spiritual  → IE status, practices, diet, commitment
  GET  /profiles/me                    → own profile
  GET  /profiles/{profile_id}          → another user's profile card
"""
from __future__ import annotations
import io
import uuid
from typing import Annotated
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from PIL import Image

from app.core.deps import get_current_user
from app.core.supabase_client import get_service_client
from app.profiles.schemas import (
    ProfileOut,
    StepBasics,
    StepLocation,
    StepIntent,
    StepAbout,
    StepSpiritual,
)

router = APIRouter(prefix="/profiles", tags=["profiles"])
CurrentUser = Annotated[dict, Depends(get_current_user)]

PHOTO_BUCKET = "profile-photos"
MAX_PHOTO_SIZE_BYTES = 5 * 1024 * 1024  # 5 MB raw upload limit (before compression)
ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp"}

# Compression settings — images are stored at display-ready resolution.
# 1 200 px on the long edge looks great on phone screens; JPEG q=82 gives
# ~4–8× smaller files than typical phone shots with no visible quality loss.
_MAX_DIMENSION = 1_200   # pixels on the longest side
_JPEG_QUALITY  = 82      # 75-85 is the sweet spot for quality vs. size


def _compress_image(raw: bytes) -> tuple[bytes, str]:
    """
    Resize + re-encode the image as JPEG.

    Returns (compressed_bytes, "jpg").  Raises HTTPException on corrupt input.
    """
    try:
        img = Image.open(io.BytesIO(raw))
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not decode image. Make sure the file is a valid JPEG, PNG, or WebP.",
        )

    # Strip EXIF / animation frames — work with a single static frame.
    img = img.convert("RGB")

    # Downscale only — never upscale.
    if max(img.width, img.height) > _MAX_DIMENSION:
        img.thumbnail((_MAX_DIMENSION, _MAX_DIMENSION), Image.LANCZOS)

    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=_JPEG_QUALITY, optimize=True)
    return buf.getvalue(), "jpg"


def _require_profile(user: CurrentUser) -> str:
    """Return profile_id or raise 404."""
    if not user["profile_id"]:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found. Start onboarding.")
    return user["profile_id"]


def _update_profile(profile_id: str, data: dict) -> dict:
    svc = get_service_client()
    resp = svc.table("profiles").update(data).eq("id", profile_id).execute()
    if not resp.data:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Profile update failed")
    return resp.data[0]


# ── Step 1: Photos (first!) ──────────────────────────────────────────────────

@router.post("/onboarding/photos", status_code=status.HTTP_201_CREATED)
async def upload_photos(
    user: CurrentUser,
    files: list[UploadFile] = File(...),
):
    """Upload 3–9 profile photos. This is step 1 of onboarding."""
    if not (3 <= len(files) <= 9):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Upload between 3 and 9 photos."
        )

    svc = get_service_client()

    # Create profile stub if it doesn't exist yet
    profile_id = user["profile_id"]
    if profile_id is None:
        resp = svc.table("profiles").insert({
            "user_id": user["user_id"],
            "name": "_",               # placeholder, overwritten in basics step
            "dob": "2000-01-01",       # placeholder, overwritten in basics step
            "gender": "male",          # placeholder
            "interested_in_gender": "female",  # placeholder
            "city": "",
            "state": "",
            "looking_for": "long_term",  # placeholder, overwritten in intent step
            "onboarding_step": "photos",
        }).execute()
        profile_id = resp.data[0]["id"]

    uploaded_urls: list[dict] = []
    for position, file in enumerate(files):
        if file.content_type not in ALLOWED_CONTENT_TYPES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File {file.filename}: only JPEG, PNG, WebP are allowed."
            )

        content = await file.read()
        if len(content) > MAX_PHOTO_SIZE_BYTES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File {file.filename} exceeds 5 MB limit."
            )

        compressed, ext = _compress_image(content)
        key = f"{user['user_id']}/{profile_id}/{uuid.uuid4()}.{ext}"

        svc.storage.from_(PHOTO_BUCKET).upload(
            path=key,
            file=compressed,
            file_options={"content-type": "image/jpeg"},
        )

        public_url = svc.storage.from_(PHOTO_BUCKET).get_public_url(key)

        # Store in photos table
        svc.table("photos").insert({
            "profile_id": profile_id,
            "storage_key": key,
            "url": public_url,
            "position": position,
        }).execute()

        uploaded_urls.append({"position": position, "url": public_url})

    # Advance onboarding step
    _update_profile(profile_id, {"onboarding_step": "basics"})

    return {"profile_id": profile_id, "photos": uploaded_urls, "next_step": "basics"}


# ── Step 2: Basics ───────────────────────────────────────────────────────────

@router.post("/onboarding/basics")
async def onboarding_basics(user: CurrentUser, body: StepBasics):
    profile_id = _require_profile(user)
    _update_profile(profile_id, {
        "name": body.name,
        "dob": body.dob.isoformat(),
        "gender": body.gender,
        "interested_in_gender": body.interested_in_gender,
        "onboarding_step": "location",
    })
    return {"next_step": "location"}


# ── Step 3: Location ─────────────────────────────────────────────────────────

@router.post("/onboarding/location")
async def onboarding_location(user: CurrentUser, body: StepLocation):
    profile_id = _require_profile(user)

    update_data: dict = {
        "city": body.city,
        "state": body.state,
        "country": body.country,
        "onboarding_step": "intent",
    }
    if body.latitude is not None and body.longitude is not None:
        # PostGIS point: ST_MakePoint(lng, lat)
        update_data["location"] = f"SRID=4326;POINT({body.longitude} {body.latitude})"

    _update_profile(profile_id, update_data)
    return {"next_step": "intent"}


# ── Step 4: Intent (height, looking for) ────────────────────────────────────

@router.post("/onboarding/intent")
async def onboarding_intent(user: CurrentUser, body: StepIntent):
    profile_id = _require_profile(user)
    _update_profile(profile_id, {
        "looking_for": body.looking_for,
        "height_cm": body.height_cm,
        "min_height_cm": body.min_height_cm,
        "max_height_cm": body.max_height_cm,
        "preferred_age_buckets": body.preferred_age_buckets,
        "onboarding_step": "about",
    })
    return {"next_step": "about"}


# ── Step 5: About (bio + career) ─────────────────────────────────────────────

@router.post("/onboarding/about")
async def onboarding_about(user: CurrentUser, body: StepAbout):
    profile_id = _require_profile(user)
    _update_profile(profile_id, {
        "about_me": body.about_me,
        "job_title": body.job_title,
        "degree": body.degree,
        "salary_bracket": body.salary_bracket,
        "onboarding_step": "spiritual",
    })
    return {"next_step": "spiritual"}


# ── Step 6: Spiritual ────────────────────────────────────────────────────────

@router.post("/onboarding/spiritual")
async def onboarding_spiritual(user: CurrentUser, body: StepSpiritual):
    profile_id = _require_profile(user)
    _update_profile(profile_id, {
        "ie_status": body.ie_status,
        "daily_practices": body.daily_practices,
        "diet": body.diet,
        "commitment_level": body.commitment_level,
        "onboarding_step": "complete",
        "onboarding_complete": True,
    })
    return {"next_step": "complete", "message": "Profile complete. Welcome to Oneness."}


# ── Profile reads ────────────────────────────────────────────────────────────

@router.get("/me")
async def get_my_profile(user: CurrentUser):
    profile_id = _require_profile(user)
    svc = get_service_client()
    profile = svc.table("profiles").select("*, photos(*)").eq("id", profile_id).single().execute()
    if not profile.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found")
    return profile.data


@router.get("/{profile_id}")
async def get_profile(profile_id: str, user: CurrentUser):
    """Returns a profile card (no salary, no subscription info)."""
    svc = get_service_client()
    resp = svc.table("profiles").select(
        "id, name, dob, gender, city, height_cm, about_me, job_title, "
        "looking_for, ie_status, daily_practices, diet, commitment_level, "
        "last_active_at, photos(id, url, position)"
    ).eq("id", profile_id).eq("is_active", True).limit(1).execute()

    if not resp.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found")
    return resp.data[0]
