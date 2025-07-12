-- Migration: Simplify user schema
-- 1. Remove vault_public_key (not needed - OpenADP handles keys)
-- 2. Switch to email-based user identification
-- 3. Keep auth_provider to track most recent login method

-- Drop the vault_public_key column
ALTER TABLE users DROP COLUMN IF EXISTS vault_public_key;

-- Make email the primary identifier (it should already be NOT NULL)
ALTER TABLE users ADD CONSTRAINT IF NOT EXISTS users_email_unique UNIQUE (email);

-- The auth_provider column already exists and tracks the most recent provider
-- Just add a comment to clarify its purpose
COMMENT ON TABLE users IS 'Simplified user table - email is the primary identifier, auth_provider tracks most recent login method';
COMMENT ON COLUMN users.auth_provider IS 'Most recent OAuth provider used to sign in (google, apple, etc)';
COMMENT ON COLUMN users.openadp_metadata_a IS 'OpenADP metadata slot A - part of two-slot refresh cycle';
COMMENT ON COLUMN users.openadp_metadata_b IS 'OpenADP metadata slot B - part of two-slot refresh cycle';
COMMENT ON COLUMN users.openadp_metadata_current IS 'Flag: TRUE=use slot A, FALSE=use slot B';

-- Note: We keep the user_id column as-is for now to avoid breaking existing code
-- In a future migration, we could switch to UUID: ALTER TABLE users ALTER COLUMN user_id TYPE UUID USING gen_random_uuid(); 