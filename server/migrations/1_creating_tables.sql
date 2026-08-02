-- --- 1. NUCLEAR CLEANUP ---
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS system_settings CASCADE;
DROP TABLE IF EXISTS posts CASCADE;
DROP TABLE IF EXISTS refresh_tokens CASCADE;
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
CREATE TYPE user_role AS ENUM ('user', 'admin', 'super_admin'); 

-- --- 3. UTILITY FUNCTIONS ---
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- --- 4. THE USERS TABLE ---
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(20) UNIQUE NOT NULL CHECK (char_length(username) >= 3),
    profile_title VARCHAR(100) DEFAULT 'Member',                                      
    avatar_url VARCHAR(2048) DEFAULT 'https://res.cloudinary.com/dhr9zmb3i/image/upload/v1782116959/portfolio/p8f5k0lhoukdzptxy6fj.jpg', 
    password_hash VARCHAR(255) NOT NULL CHECK (char_length(password_hash) >= 60),
    role user_role NOT NULL DEFAULT 'user', 
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- --- 4.5. THE REFRESH TOKENS TABLE (SERIOUS AUTH) ---
CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    parent_token_id UUID REFERENCES refresh_tokens(id) ON DELETE SET NULL, 
    is_revoked BOOLEAN NOT NULL DEFAULT false,
    expires_at TIMESTAMPTZ NOT NULL,
    user_agent VARCHAR(1024),
    ip_address VARCHAR(45),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- --- 5. THE POSTS TABLE ---
CREATE TABLE posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category post_category NOT NULL,
    subcategory project_subcategory,
    thumbnail VARCHAR(2048) NOT NULL CHECK (char_length(thumbnail) <= 2048),
    post_images TEXT[] NOT NULL CHECK (cardinality(post_images) BETWEEN 1 AND 5),
    title VARCHAR(150) NOT NULL CHECK (char_length(title) BETWEEN 5 AND 150),
    short_description VARCHAR(300) NOT NULL CHECK (char_length(short_description) BETWEEN 10 AND 300),
    main_content TEXT NOT NULL CHECK (char_length(main_content) BETWEEN 50 AND 15000),
    tags TEXT[] NOT NULL CHECK (cardinality(tags) BETWEEN 1 AND 5),
    external_link VARCHAR(2048), 
    github_link VARCHAR(2048),   
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

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
        DEFAULT 'System is under maintenance. Protocols are being updated.',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL
);

INSERT INTO system_settings (id, is_maintenance) 
VALUES (1, false);

-- --- 5.2. THE AUDIT LOGS TABLE ---
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID REFERENCES users(id) ON DELETE SET NULL,
    admin_username VARCHAR(20) NOT NULL,
    action VARCHAR(100) NOT NULL, 
    details TEXT NOT NULL,        
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

    search_vector tsvector GENERATED ALWAYS AS (
        setweight(to_tsvector('english', coalesce(action, '')), 'A') ||
        setweight(to_tsvector('english', coalesce(admin_username, '')), 'B') ||
        setweight(to_tsvector('english', coalesce(details, '')), 'C')
    ) STORED
);

-- --- 6. PERFORMANCE INDEXES ---
CREATE INDEX idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX idx_posts_search ON posts USING GIN(search_vector);
CREATE INDEX idx_posts_category ON posts(category);
CREATE INDEX idx_posts_tags ON posts USING GIN(tags);
CREATE INDEX idx_posts_author ON posts(author_id);
CREATE INDEX idx_posts_title_trgm ON posts USING GIN(title gin_trgm_ops);
CREATE INDEX idx_audit_logs_search ON audit_logs USING GIN(search_vector);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- Auth Optimization Indexes
CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_token_hash ON refresh_tokens(token_hash);
CREATE INDEX idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);

-- --- 7. AUTOMATION TRIGGERS ---
CREATE TRIGGER trigger_update_users_timestamp
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trigger_update_posts_timestamp
    BEFORE UPDATE ON posts
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trigger_update_settings_timestamp
    BEFORE UPDATE ON system_settings
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();