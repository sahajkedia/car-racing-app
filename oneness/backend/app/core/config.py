from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # Supabase
    supabase_url: str
    supabase_anon_key: str
    supabase_service_role_key: str  # used server-side only, never exposed to client

    # App
    app_name: str = "Oneness"
    debug: bool = False
    cors_origins: list[str] = ["http://localhost:3000"]

    # Scoring
    daily_sangha_size: int = 10
    max_distance_km: int = 100


settings = Settings()
