"""
Messaging endpoints — open messaging (anyone can message anyone in their Sangha).

POST /messages/           → send a message
GET  /messages/threads    → list all conversation threads
GET  /messages/{profile_id} → get thread with a specific user
PATCH /messages/{profile_id}/read → mark thread as read
POST /messages/report     → report a relationship outcome (gold label)
"""
from __future__ import annotations
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from typing import Annotated

from app.core.deps import get_current_user
from app.core.supabase_client import get_service_client

router = APIRouter(prefix="/messages", tags=["messages"])
CurrentUser = Annotated[dict, Depends(get_current_user)]

REPORT_OUTCOMES = {"still_chatting", "went_on_date", "together", "not_a_fit"}


class SendMessageRequest(BaseModel):
    to_profile_id: str
    content: str = Field(..., min_length=1, max_length=2000)


class RelationshipReportRequest(BaseModel):
    about_profile_id: str
    outcome: str

    def validate_outcome(self) -> None:
        if self.outcome not in REPORT_OUTCOMES:
            raise ValueError(f"outcome must be one of {REPORT_OUTCOMES}")


@router.post("/", status_code=status.HTTP_201_CREATED)
async def send_message(user: CurrentUser, body: SendMessageRequest):
    """Send a message. Automatically logs a message_sent signal."""
    if not user["profile_id"]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Complete onboarding first.")

    from_id = user["profile_id"]
    svc = get_service_client()

    # Insert message
    svc.table("messages").insert({
        "from_profile_id": from_id,
        "to_profile_id": body.to_profile_id,
        "content": body.content,
    }).execute()

    # Log signal — determine if this is first message in thread
    existing = svc.table("messages").select("id", count="exact") \
        .eq("from_profile_id", from_id) \
        .eq("to_profile_id", body.to_profile_id) \
        .execute()
    is_first = (existing.count or 0) <= 1

    svc.table("signals").insert({
        "from_profile_id": from_id,
        "to_profile_id": body.to_profile_id,
        "signal_type": "message_sent",
        "metadata": {"is_first_message": is_first, "message_length": len(body.content)},
    }).execute()

    # Check if thread now has 10+ messages (proxy label collection)
    thread_count = svc.table("messages").select("id", count="exact") \
        .or_(
            f"and(from_profile_id.eq.{from_id},to_profile_id.eq.{body.to_profile_id}),"
            f"and(from_profile_id.eq.{body.to_profile_id},to_profile_id.eq.{from_id})"
        ).execute()

    if (thread_count.count or 0) >= 10:
        # Check if we already logged thread_10plus for this pair
        already = svc.table("signals").select("id") \
            .eq("from_profile_id", from_id) \
            .eq("to_profile_id", body.to_profile_id) \
            .eq("signal_type", "thread_10plus") \
            .limit(1).execute()

        if not already.data:
            svc.table("signals").insert({
                "from_profile_id": from_id,
                "to_profile_id": body.to_profile_id,
                "signal_type": "thread_10plus",
                "metadata": {"thread_length": thread_count.count},
            }).execute()

    return {"sent": True}


@router.get("/threads")
async def list_threads(user: CurrentUser):
    """List all conversation threads for the current user."""
    if not user["profile_id"]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Complete onboarding first.")

    pid = user["profile_id"]
    svc = get_service_client()

    resp = svc.table("messages").select(
        "from_profile_id, to_profile_id, content, created_at, is_read"
    ).or_(
        f"from_profile_id.eq.{pid},to_profile_id.eq.{pid}"
    ).order("created_at", desc=True).execute()

    # Group into threads
    threads: dict[str, dict] = {}
    for msg in (resp.data or []):
        other = msg["to_profile_id"] if msg["from_profile_id"] == pid else msg["from_profile_id"]
        key = other
        if key not in threads:
            threads[key] = {
                "other_profile_id": other,
                "last_message": msg["content"],
                "last_message_at": msg["created_at"],
                "unread": 0,
            }
        if msg["to_profile_id"] == pid and not msg["is_read"]:
            threads[key]["unread"] += 1

    return {"threads": list(threads.values())}


@router.get("/{profile_id}")
async def get_thread(profile_id: str, user: CurrentUser, limit: int = 50):
    """Get message thread with a specific user."""
    if not user["profile_id"]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Complete onboarding first.")

    pid = user["profile_id"]
    svc = get_service_client()

    msgs = svc.table("messages").select("*") \
        .or_(
            f"and(from_profile_id.eq.{pid},to_profile_id.eq.{profile_id}),"
            f"and(from_profile_id.eq.{profile_id},to_profile_id.eq.{pid})"
        ).order("created_at", asc=True).limit(limit).execute()

    # Log message_replied signal if candidate replied to our message
    last_from_other = next(
        (m for m in reversed(msgs.data or []) if m["from_profile_id"] == profile_id),
        None,
    )
    if last_from_other:
        already = svc.table("signals").select("id") \
            .eq("from_profile_id", profile_id) \
            .eq("to_profile_id", pid) \
            .eq("signal_type", "message_replied") \
            .limit(1).execute()
        if not already.data:
            svc.table("signals").insert({
                "from_profile_id": profile_id,
                "to_profile_id": pid,
                "signal_type": "message_replied",
                "metadata": {},
            }).execute()

    return {"messages": msgs.data or []}


@router.patch("/{profile_id}/read")
async def mark_read(profile_id: str, user: CurrentUser):
    """Mark all messages from profile_id in this thread as read."""
    if not user["profile_id"]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Complete onboarding first.")

    pid = user["profile_id"]
    svc = get_service_client()
    svc.table("messages").update({"is_read": True}) \
        .eq("from_profile_id", profile_id) \
        .eq("to_profile_id", pid) \
        .execute()
    return {"marked_read": True}


@router.post("/report", status_code=status.HTTP_201_CREATED)
async def report_relationship(user: CurrentUser, body: RelationshipReportRequest):
    """Gold-label collection: user self-reports the outcome of a connection."""
    if not user["profile_id"]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Complete onboarding first.")

    body.validate_outcome()
    pid = user["profile_id"]
    svc = get_service_client()

    # Get thread stats for the report
    thread_count = svc.table("messages").select("id", count="exact") \
        .or_(
            f"and(from_profile_id.eq.{pid},to_profile_id.eq.{body.about_profile_id}),"
            f"and(from_profile_id.eq.{body.about_profile_id},to_profile_id.eq.{pid})"
        ).execute()

    svc.table("relationship_reports").upsert({
        "reporter_id": pid,
        "reported_about_id": body.about_profile_id,
        "outcome": body.outcome,
        "thread_msg_count": thread_count.count or 0,
    }).execute()

    # Log as signal too (for the proxy ladder)
    signal_type = (
        "date_reported" if body.outcome == "went_on_date"
        else "relationship_reported" if body.outcome == "together"
        else "profile_viewed"  # neutral placeholder for other outcomes
    )
    if signal_type in ("date_reported", "relationship_reported"):
        svc.table("signals").insert({
            "from_profile_id": pid,
            "to_profile_id": body.about_profile_id,
            "signal_type": signal_type,
            "metadata": {"outcome": body.outcome},
        }).execute()

    return {"reported": True}
