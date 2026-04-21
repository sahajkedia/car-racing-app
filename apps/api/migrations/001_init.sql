CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    display_name TEXT NOT NULL,
    gender TEXT NOT NULL,
    is_admin BOOLEAN NOT NULL DEFAULT FALSE,
    account_status TEXT NOT NULL DEFAULT 'active',
    is_visible BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS profiles (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    bio TEXT NOT NULL DEFAULT '',
    city TEXT NOT NULL DEFAULT '',
    country TEXT NOT NULL DEFAULT '',
    language TEXT NOT NULL DEFAULT '',
    age INT NOT NULL DEFAULT 18,
    occupation TEXT NOT NULL DEFAULT '',
    looking_for TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS spiritual_profiles (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    tradition TEXT NOT NULL DEFAULT '',
    values TEXT[] NOT NULL DEFAULT '{}',
    practices TEXT[] NOT NULL DEFAULT '{}',
    community_style TEXT NOT NULL DEFAULT '',
    lifestyle_choices TEXT[] NOT NULL DEFAULT '{}',
    embedding VECTOR(1536),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS discovery_preferences (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    min_age INT NOT NULL DEFAULT 18,
    max_age INT NOT NULL DEFAULT 60,
    max_distance_km INT NOT NULL DEFAULT 100,
    cities TEXT[] NOT NULL DEFAULT '{}',
    languages TEXT[] NOT NULL DEFAULT '{}',
    spiritual_values TEXT[] NOT NULL DEFAULT '{}',
    community_styles TEXT[] NOT NULL DEFAULT '{}',
    preferred_tradition TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS message_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    intro_message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    conversation_id UUID UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT no_self_request CHECK (sender_id <> recipient_id)
);

CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_a_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user_b_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_from_request_id UUID NOT NULL UNIQUE REFERENCES message_requests(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT no_self_conversation CHECK (user_a_id <> user_b_id)
);

ALTER TABLE message_requests
    ADD CONSTRAINT fk_message_requests_conversation
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    body TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS blocks (
    blocker_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    blocked_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (blocker_id, blocked_id),
    CONSTRAINT no_self_block CHECK (blocker_id <> blocked_id)
);

CREATE TABLE IF NOT EXISTS reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reported_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
    reason TEXT NOT NULL,
    details TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'open',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS interaction_events (
    id BIGSERIAL PRIMARY KEY,
    actor_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
    event_type TEXT NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS message_requests_pending_unique
    ON message_requests (sender_id, recipient_id)
    WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS users_visibility_idx
    ON users (account_status, is_visible, gender);

CREATE INDEX IF NOT EXISTS profiles_discovery_idx
    ON profiles (city, language, age, updated_at DESC);

CREATE INDEX IF NOT EXISTS message_requests_inbox_idx
    ON message_requests (recipient_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS conversations_members_idx
    ON conversations (user_a_id, user_b_id, last_message_at DESC);

CREATE INDEX IF NOT EXISTS messages_conversation_idx
    ON messages (conversation_id, created_at DESC);

CREATE INDEX IF NOT EXISTS blocks_lookup_idx
    ON blocks (blocked_id, blocker_id);

CREATE INDEX IF NOT EXISTS reports_status_idx
    ON reports (status, created_at DESC);

CREATE INDEX IF NOT EXISTS interaction_events_actor_idx
    ON interaction_events (actor_user_id, created_at DESC);
