"""
Oneness Dating App — FastAPI entry point
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.auth.router import router as auth_router
from app.profiles.router import router as profiles_router
from app.matching.router import router as matching_router
from app.signals.router import router as messages_router

app = FastAPI(
    title="Oneness API",
    description="Spiritual dating app for the Isha community",
    version="0.1.0",
    docs_url="/docs" if settings.debug else None,
    redoc_url="/redoc" if settings.debug else None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(profiles_router)
app.include_router(matching_router)
app.include_router(messages_router)


@app.get("/health")
async def health():
    return {"status": "ok", "app": settings.app_name}
