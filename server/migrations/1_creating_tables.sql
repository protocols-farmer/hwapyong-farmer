-- server/migrations/1_creating_tables.sql
-- --- 1. NUCLEAR CLEANUP ---
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS system_settings CASCADE;
DROP TABLE IF EXISTS posts CASCADE;
DROP TABLE IF EXISTS refresh_tokens CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS profile CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TYPE IF EXISTS post_category CASCADE;
DROP TYPE IF EXISTS project_subcategory CASCADE;
DROP TYPE IF EXISTS user_role CASCADE;
DROP FUNCTION IF EXISTS set_updated_at CASCADE;

-- --- 2. CORE SETUP ---
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Enum types
CREATE TYPE post_category AS ENUM ('bio-engineering', 'computer-science', 'projects', 'diary');
CREATE TYPE project_subcategory AS ENUM ('serious', 'random');

-- --- 3. UTILITY FUNCTIONS ---
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- --- 4. THE PROFILE TABLE (SINGLE OWNER) ---
CREATE TABLE profile (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(20) UNIQUE NOT NULL CHECK (char_length(username) BETWEEN 3 AND 20),
    display_name VARCHAR(50) NOT NULL CHECK (char_length(display_name) BETWEEN 2 AND 50),
    profile_title VARCHAR(100) NOT NULL DEFAULT 'Member' CHECK (char_length(profile_title) <= 100),
    avatar_url VARCHAR(2048) NOT NULL DEFAULT 'https://res.cloudinary.com/dhr9zmb3i/image/upload/v1782114895/avatar-fallback_jnzqae.jpg' CHECK (char_length(avatar_url) <= 2048),
    password_hash VARCHAR(255) NOT NULL CHECK (char_length(password_hash) >= 60),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Enforce a strict single-row limit on the profile table
CREATE UNIQUE INDEX idx_profile_single_row ON profile ((true));
CREATE UNIQUE INDEX idx_profile_username_lower ON profile (LOWER(username));

-- --- 4.5. THE SESSIONS TABLE (OPAQUE HEADER TOKEN AUTH) ---
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    user_agent VARCHAR(1024),
    ip_address VARCHAR(45),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- --- 5. THE POSTS TABLE ---
CREATE TABLE posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(120) UNIQUE NOT NULL CHECK (char_length(slug) BETWEEN 3 AND 120),
    category post_category NOT NULL,
    subcategory project_subcategory,
    is_published BOOLEAN NOT NULL DEFAULT true,
    featured BOOLEAN NOT NULL DEFAULT false,
    thumbnail VARCHAR(2048) NOT NULL CHECK (char_length(thumbnail) <= 2048),
    post_images TEXT[] NOT NULL CHECK (cardinality(post_images) BETWEEN 1 AND 5),
    title VARCHAR(150) NOT NULL CHECK (char_length(title) BETWEEN 5 AND 150),
    short_description VARCHAR(300) NOT NULL CHECK (char_length(short_description) BETWEEN 10 AND 300),
    main_content TEXT NOT NULL CHECK (char_length(main_content) BETWEEN 50 AND 40000),
    tags TEXT[] NOT NULL CHECK (cardinality(tags) BETWEEN 1 AND 5),
    external_link VARCHAR(2048),
    github_link VARCHAR(2048),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    search_vector tsvector GENERATED ALWAYS AS (
        setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
        setweight(to_tsvector('english', coalesce(short_description, '')), 'B') ||
        setweight(to_tsvector('english', coalesce(main_content, '')), 'C')
    ) STORED,

    CONSTRAINT check_project_subcategory CHECK (
        (category = 'projects' AND subcategory IS NOT NULL) OR
        (category != 'projects' AND subcategory IS NULL)
    ),

    CONSTRAINT check_serious_project_github CHECK (
        (subcategory != 'serious') OR (github_link IS NOT NULL AND github_link <> '')
    )
);

-- --- 5.1. THE SYSTEM SETTINGS TABLE ---
CREATE TABLE system_settings (
    id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    is_maintenance BOOLEAN NOT NULL DEFAULT false,
    maintenance_message VARCHAR(500) NOT NULL
        CHECK (char_length(maintenance_message) BETWEEN 10 AND 500)
        DEFAULT 'The site is under maintenance. Please check back soon.',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO system_settings (id, is_maintenance)
VALUES (1, false);

-- --- 6. PERFORMANCE INDEXES ---
CREATE INDEX idx_posts_created_at ON posts (created_at DESC);
CREATE INDEX idx_posts_is_published_created_at ON posts (is_published, created_at DESC);
CREATE INDEX idx_posts_search ON posts USING GIN (search_vector);
CREATE INDEX idx_posts_category ON posts (category);
CREATE INDEX idx_posts_tags ON posts USING GIN (tags);
CREATE INDEX idx_posts_title_trgm ON posts USING GIN (title gin_trgm_ops);

-- Session Optimization Index
CREATE INDEX idx_sessions_expires_at ON sessions (expires_at);

-- --- 7. AUTOMATION TRIGGERS ---
CREATE TRIGGER trigger_update_profile_timestamp
    BEFORE UPDATE ON profile
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trigger_update_posts_timestamp
    BEFORE UPDATE ON posts
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trigger_update_settings_timestamp
    BEFORE UPDATE ON system_settings
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
