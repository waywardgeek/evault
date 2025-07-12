-- Fresh database schema for eVault
-- This creates a clean database without any legacy fields

-- Drop existing tables if they exist (careful in production!)
DROP TABLE IF EXISTS entries CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS schema_migrations CASCADE;

-- Create schema migrations table
CREATE TABLE schema_migrations (
    version VARCHAR(255) PRIMARY KEY,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create users table with simplified schema
CREATE TABLE users (
    user_id VARCHAR(255) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone_number VARCHAR(20),
    auth_provider VARCHAR(50) NOT NULL,
    verified BOOLEAN DEFAULT FALSE,
    openadp_metadata_a TEXT,
    openadp_metadata_b TEXT,
    openadp_metadata_current BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_openadp_current ON users(openadp_metadata_current);

-- Create entries table
CREATE TABLE entries (
    user_id VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    hpke_blob BYTEA NOT NULL,
    deletion_hash BYTEA NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, name),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Create index for entries
CREATE INDEX idx_entries_user_id ON entries(user_id);

-- Add helpful comments
COMMENT ON TABLE users IS 'User accounts - email is the primary identifier, auth_provider tracks most recent login method';
COMMENT ON COLUMN users.user_id IS 'Primary key - currently provider-specific ID, future: UUID';
COMMENT ON COLUMN users.email IS 'User email - unique identifier across all auth providers';
COMMENT ON COLUMN users.auth_provider IS 'Most recent OAuth provider used (google, apple, etc)';
COMMENT ON COLUMN users.openadp_metadata_a IS 'OpenADP metadata slot A - part of two-slot refresh cycle';
COMMENT ON COLUMN users.openadp_metadata_b IS 'OpenADP metadata slot B - part of two-slot refresh cycle';
COMMENT ON COLUMN users.openadp_metadata_current IS 'Flag: TRUE=use slot A, FALSE=use slot B';

COMMENT ON TABLE entries IS 'Encrypted vault entries - automatically deleted when user is deleted';
COMMENT ON COLUMN entries.hpke_blob IS 'HPKE-encrypted entry data';
COMMENT ON COLUMN entries.deletion_hash IS 'Hash for secure deletion verification';

-- Mark this migration as applied
INSERT INTO schema_migrations (version) VALUES ('000_fresh_start.sql'); 