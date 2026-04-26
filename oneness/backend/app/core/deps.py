"""
FastAPI dependency injection.

`get_current_user` validates the Supabase JWT from the Authorization header
and returns the authenticated user's profile_id and user_id.
"""
from __future__ import annotations
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import Client
from app.core.supabase_client import get_anon_client, get_service_client

bearer = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
    client: Client = Depends(get_anon_client),
) -> dict:
    """Validate Supabase JWT and return user info.

    Returns dict with keys: user_id (str), profile_id (str | None)
    """
    token = credentials.credentials
    try:
        response = client.auth.get_user(token)
        if response.user is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")

    user_id = str(response.user.id)

    # Fetch the profile_id linked to this user
    svc = get_service_client()
    profile_resp = svc.table("profiles").select("id").eq("user_id", user_id).limit(1).execute()
    profile_id = profile_resp.data[0]["id"] if profile_resp.data else None

    return {"user_id": user_id, "profile_id": profile_id}
