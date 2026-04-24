"""
Supabase client factory.

Two clients:
- `get_anon_client()` — uses anon key; respects RLS. Use for user-facing reads.
- `get_service_client()` — uses service role key; bypasses RLS. Use for
  server-side operations like matching (reading all eligible profiles).
"""
from functools import lru_cache
from supabase import create_client, Client
from app.core.config import settings


@lru_cache(maxsize=1)
def get_anon_client() -> Client:
    return create_client(settings.supabase_url, settings.supabase_anon_key)


@lru_cache(maxsize=1)
def get_service_client() -> Client:
    return create_client(settings.supabase_url, settings.supabase_service_role_key)
