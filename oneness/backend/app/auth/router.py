"""
Auth endpoints — phone number + OTP via Supabase Auth.

Flow:
  1. POST /auth/send-otp   → sends OTP to phone number
  2. POST /auth/verify-otp → verifies OTP, returns session tokens

Supabase handles the Twilio SMS delivery under the hood.
Configure: Supabase Dashboard → Authentication → Phone → enable phone provider.
"""
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, field_validator
import re
from app.core.supabase_client import get_anon_client

router = APIRouter(prefix="/auth", tags=["auth"])


class SendOTPRequest(BaseModel):
    phone: str  # E.164 format: +919876543210

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        if not re.match(r"^\+[1-9]\d{6,14}$", v):
            raise ValueError("Phone must be in E.164 format: +[country_code][number]")
        return v


class VerifyOTPRequest(BaseModel):
    phone: str
    token: str  # 6-digit OTP


class SessionResponse(BaseModel):
    access_token: str
    refresh_token: str
    user_id: str
    is_new_user: bool


@router.post("/send-otp", status_code=status.HTTP_200_OK)
async def send_otp(body: SendOTPRequest):
    """Send a 6-digit OTP to the provided phone number."""
    client = get_anon_client()
    try:
        client.auth.sign_in_with_otp({"phone": body.phone})
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to send OTP: {str(e)}"
        )
    return {"message": "OTP sent successfully", "phone": body.phone}


@router.post("/verify-otp", response_model=SessionResponse)
async def verify_otp(body: VerifyOTPRequest):
    """Verify the OTP and return a session. Creates account on first use."""
    client = get_anon_client()
    try:
        response = client.auth.verify_otp({
            "phone": body.phone,
            "token": body.token,
            "type": "sms",
        })
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"OTP verification failed: {str(e)}"
        )

    session = response.session
    user = response.user
    if not session or not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Verification failed")

    # Check if profile exists (determines if this is a new user)
    from app.core.supabase_client import get_service_client
    svc = get_service_client()
    profile = svc.table("profiles").select("id").eq("user_id", str(user.id)).maybe_single().execute()
    is_new_user = profile.data is None

    return SessionResponse(
        access_token=session.access_token,
        refresh_token=session.refresh_token,
        user_id=str(user.id),
        is_new_user=is_new_user,
    )


@router.post("/refresh")
async def refresh_token(refresh_token: str):
    """Exchange a refresh token for a new access token."""
    client = get_anon_client()
    try:
        response = client.auth.refresh_session(refresh_token)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))

    return {
        "access_token": response.session.access_token,
        "refresh_token": response.session.refresh_token,
    }
