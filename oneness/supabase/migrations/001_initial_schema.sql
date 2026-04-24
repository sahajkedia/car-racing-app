-- =============================================================================
-- Oneness Dating App — Supabase Schema
-- Migration 001: Initial schema
--
-- Run this in the Supabase SQL editor or via supabase db push.
-- =============================================================================

-- Enable PostGIS for location-based queries (available in Supabase free tier)
CREATE EXTENSION IF NOT EXISTS postgis;
-- Enable pgcrypto for UUID generation
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------------
-- ENUMS
-- ---------------------------------------------------------------------------

CREATE TYPE gender_type AS ENUM ('male', 'female', 'non_binary');

CREATE TYPE looking_for_type AS ENUM (
    'date_to_marry_soon',
    'date_to_marry',
    'long_term',
    'short_term'
);

CREATE TYPE ie_status_type AS ENUM (
    'completed_shambhavi',
    'completed_ie',
    'in_progress',
    'not_done'
);

CREATE TYPE commitment_level_type AS ENUM (
    'deeply_committed',
    'regular',
    'casual'
);

CREATE TYPE diet_type AS ENUM (
    'sattvic',
    'vegan',
    'vegetarian',
    'occasionally_non_veg',
    'non_veg'
);

CREATE TYPE signal_type AS ENUM (
    'profile_viewed',
    'express_interest',
    'silent_pass',
    'message_sent',
    'message_replied',
    'thread_10plus',
    'date_reported',
    'relationship_reported'
);

CREATE TYPE onboarding_step AS ENUM (
    'photos',           -- step 1: upload at least 3 photos
    'basics',           -- step 2: name, dob, gender, interested_in
    'location',         -- step 3: city/town
    'intent',           -- step 4: looking for, height, height range preference
    'about',            -- step 5: about me, career, salary
    'spiritual',        -- step 6: IE status, practices, diet, commitment
    'complete'
);

-- ---------------------------------------------------------------------------
-- PROFILES TABLE
-- Core user data. Linked 1:1 with Supabase auth.users via user_id.
-- ---------------------------------------------------------------------------

CREATE TABLE profiles (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                 UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Basics
    name                    TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 100),
    dob                     DATE NOT NULL,
    gender                  gender_type NOT NULL,
    interested_in_gender    gender_type NOT NULL,  -- HARD RULE for matching

    -- Location
    city                    TEXT NOT NULL,
    state                   TEXT NOT NULL,
    country                 TEXT NOT NULL DEFAULT 'India',
    location                GEOGRAPHY(POINT, 4326),  -- (lng, lat) for distance queries

    -- Intent and preferences
    looking_for             looking_for_type NOT NULL,
    height_cm               SMALLINT CHECK (height_cm BETWEEN 100 AND 250),
    min_height_cm           SMALLINT DEFAULT 0,
    max_height_cm           SMALLINT DEFAULT 0,  -- 0 = no upper limit
    preferred_age_buckets   INT[] DEFAULT '{}',  -- indices into age bucket array

    -- About
    about_me                TEXT CHECK (char_length(about_me) <= 300),
    job_title               TEXT,
    degree                  TEXT,
    salary_bracket          TEXT,  -- e.g. '10-20L', '20-40L', '40-80L', '80L+'

    -- Spiritual layer (Isha pilot)
    ie_status               ie_status_type NOT NULL DEFAULT 'not_done',
    daily_practices         TEXT[] DEFAULT '{}',
    diet                    diet_type DEFAULT 'vegetarian',
    commitment_level        commitment_level_type DEFAULT 'casual',

    -- Account state
    subscription_active     BOOLEAN NOT NULL DEFAULT FALSE,
    subscription_expires_at TIMESTAMPTZ,
    is_active               BOOLEAN NOT NULL DEFAULT TRUE,
    is_blocked              BOOLEAN NOT NULL DEFAULT FALSE,

    -- Onboarding progress
    onboarding_step         onboarding_step NOT NULL DEFAULT 'photos',
    onboarding_complete     BOOLEAN NOT NULL DEFAULT FALSE,

    -- Timestamps
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_active_at          TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE (user_id)
);

-- ---------------------------------------------------------------------------
-- PHOTOS TABLE
-- Moodboard photos. Min 3, max 9. Order is user-controlled.
-- Stored in Supabase Storage bucket "profile-photos".
-- ---------------------------------------------------------------------------

CREATE TABLE photos (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    storage_key TEXT NOT NULL,           -- Supabase Storage object key
    url         TEXT NOT NULL,           -- public URL
    position    SMALLINT NOT NULL CHECK (position BETWEEN 0 AND 8),
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (profile_id, position)
);

-- ---------------------------------------------------------------------------
-- SANGHA QUEUE TABLE
-- Tracks which 10 profiles were shown to each user per session.
-- Used to deduplicate (don't show same profile twice in a row)
-- and to record behavioral signals against.
-- ---------------------------------------------------------------------------

CREATE TABLE sangha_sessions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    viewer_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    candidate_ids   UUID[] NOT NULL,      -- ordered list of 10 profile IDs shown
    scores          FLOAT8[] NOT NULL,    -- parallel array of compatibility scores
    weights_snapshot JSONB,              -- scoring weights used (for drift tracking)
    is_cold_start   BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at      TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
    refreshed_at    TIMESTAMPTZ
);

CREATE INDEX idx_sangha_viewer ON sangha_sessions(viewer_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- SIGNALS TABLE (MLOps data backbone)
-- Every behavioral event between two users. Powers the proxy signal ladder.
-- ---------------------------------------------------------------------------

CREATE TABLE signals (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    to_profile_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    signal_type     signal_type NOT NULL,
    session_id      UUID REFERENCES sangha_sessions(id),
    metadata        JSONB DEFAULT '{}',
    -- metadata examples:
    --   profile_viewed: {"time_spent_ms": 4200, "scroll_depth_pct": 0.72}
    --   message_sent: {"message_length": 142, "is_first_message": true}
    --   date_reported: {"months_since_match": 2}
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_signals_from ON signals(from_profile_id, signal_type, created_at DESC);
CREATE INDEX idx_signals_to   ON signals(to_profile_id, signal_type, created_at DESC);
CREATE INDEX idx_signals_pair ON signals(from_profile_id, to_profile_id, signal_type);

-- ---------------------------------------------------------------------------
-- MESSAGES TABLE
-- Open messaging — anyone can message anyone in their Sangha.
-- ---------------------------------------------------------------------------

CREATE TABLE messages (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    to_profile_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    content         TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 2000),
    is_read         BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_messages_thread ON messages(
    LEAST(from_profile_id, to_profile_id),
    GREATEST(from_profile_id, to_profile_id),
    created_at ASC
);
CREATE INDEX idx_messages_recipient ON messages(to_profile_id, is_read, created_at DESC);

-- ---------------------------------------------------------------------------
-- RELATIONSHIP REPORTS TABLE (gold label collection)
-- Voluntary. Triggered after 10+ message threads >= 14 days old.
-- ---------------------------------------------------------------------------

CREATE TABLE relationship_reports (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    reported_about_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    outcome             TEXT NOT NULL,
    -- 'still_chatting' | 'went_on_date' | 'together' | 'not_a_fit'
    thread_age_days     INT,
    thread_msg_count    INT,
    reported_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (reporter_id, reported_about_id)
);

-- ---------------------------------------------------------------------------
-- UPDATED_AT TRIGGER (auto-update on profile change)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ---------------------------------------------------------------------------
-- ROW LEVEL SECURITY (RLS)
-- ---------------------------------------------------------------------------

ALTER TABLE profiles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos             ENABLE ROW LEVEL SECURITY;
ALTER TABLE sangha_sessions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE signals            ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages           ENABLE ROW LEVEL SECURITY;
ALTER TABLE relationship_reports ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read any profile (needed for matching),
-- but can only update their own.
CREATE POLICY "profiles_select_all"  ON profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert_own"  ON profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "profiles_update_own"  ON profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "profiles_delete_own"  ON profiles FOR DELETE USING (auth.uid() = user_id);

-- Photos: anyone can view, only owner can insert/update/delete.
CREATE POLICY "photos_select_all" ON photos FOR SELECT USING (true);
CREATE POLICY "photos_insert_own" ON photos FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = profile_id AND user_id = auth.uid())
);
CREATE POLICY "photos_delete_own" ON photos FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = profile_id AND user_id = auth.uid())
);

-- Sangha sessions: only the viewer sees their own sessions.
CREATE POLICY "sangha_select_own" ON sangha_sessions FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = viewer_id AND user_id = auth.uid())
);
CREATE POLICY "sangha_insert_own" ON sangha_sessions FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = viewer_id AND user_id = auth.uid())
);

-- Signals: only the sender can insert; both parties can view.
CREATE POLICY "signals_select_own" ON signals FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = from_profile_id AND user_id = auth.uid())
    OR
    EXISTS (SELECT 1 FROM profiles WHERE id = to_profile_id AND user_id = auth.uid())
);
CREATE POLICY "signals_insert_own" ON signals FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = from_profile_id AND user_id = auth.uid())
);

-- Messages: both parties can view their thread; only sender can insert.
CREATE POLICY "messages_select_own" ON messages FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = from_profile_id AND user_id = auth.uid())
    OR
    EXISTS (SELECT 1 FROM profiles WHERE id = to_profile_id AND user_id = auth.uid())
);
CREATE POLICY "messages_insert_own" ON messages FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = from_profile_id AND user_id = auth.uid())
);
CREATE POLICY "messages_update_read" ON messages FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = to_profile_id AND user_id = auth.uid())
);

-- Relationship reports: only reporter can insert/view.
CREATE POLICY "reports_own" ON relationship_reports FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = reporter_id AND user_id = auth.uid())
);

-- ---------------------------------------------------------------------------
-- STORAGE BUCKET (run in Supabase dashboard or via CLI)
-- ---------------------------------------------------------------------------
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('profile-photos', 'profile-photos', true);
--
-- Storage RLS for profile-photos:
-- Allow authenticated users to upload to their own folder (user_id/filename):
-- CREATE POLICY "photos_upload" ON storage.objects FOR INSERT WITH CHECK (
--   bucket_id = 'profile-photos' AND auth.uid()::text = (storage.foldername(name))[1]
-- );
-- CREATE POLICY "photos_view" ON storage.objects FOR SELECT USING (bucket_id = 'profile-photos');
-- CREATE POLICY "photos_delete_own" ON storage.objects FOR DELETE USING (
--   bucket_id = 'profile-photos' AND auth.uid()::text = (storage.foldername(name))[1]
-- );

-- ---------------------------------------------------------------------------
-- USEFUL VIEWS
-- ---------------------------------------------------------------------------

-- Thread summary: last message + unread count per conversation pair
CREATE OR REPLACE VIEW thread_summaries AS
SELECT
    LEAST(from_profile_id, to_profile_id)    AS profile_a,
    GREATEST(from_profile_id, to_profile_id) AS profile_b,
    COUNT(*)                                  AS message_count,
    MAX(created_at)                           AS last_message_at,
    SUM(CASE WHEN NOT is_read THEN 1 ELSE 0 END) AS unread_count
FROM messages
GROUP BY
    LEAST(from_profile_id, to_profile_id),
    GREATEST(from_profile_id, to_profile_id);

-- Profile completeness check view
CREATE OR REPLACE VIEW profile_completeness AS
SELECT
    p.id,
    p.user_id,
    p.onboarding_step,
    COUNT(ph.id) AS photo_count,
    p.about_me IS NOT NULL AND char_length(p.about_me) > 0 AS has_about,
    p.height_cm > 0 AS has_height,
    p.ie_status != 'not_done' AS has_spiritual_gate,
    p.onboarding_complete
FROM profiles p
LEFT JOIN photos ph ON ph.profile_id = p.id
GROUP BY p.id;
