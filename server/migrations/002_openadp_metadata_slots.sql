-- Add two-slot OpenADP metadata storage with flag
-- This implements the proper OpenADP metadata refresh cycle

-- Drop old columns to ensure clean state
ALTER TABLE users DROP COLUMN IF EXISTS openadp_metadata;
ALTER TABLE users DROP COLUMN IF EXISTS openadp_metadata_a;
ALTER TABLE users DROP COLUMN IF EXISTS openadp_metadata_b;
ALTER TABLE users DROP COLUMN IF EXISTS openadp_metadata_current;

-- Add new columns for two-slot system
ALTER TABLE users ADD COLUMN openadp_metadata_a TEXT;
ALTER TABLE users ADD COLUMN openadp_metadata_b TEXT;
ALTER TABLE users ADD COLUMN openadp_metadata_current BOOLEAN DEFAULT TRUE;

-- Index for faster metadata queries
CREATE INDEX IF NOT EXISTS idx_users_openadp_current ON users(openadp_metadata_current);

-- Comment explaining the two-slot system
COMMENT ON COLUMN users.openadp_metadata_a IS 'OpenADP metadata slot A - part of two-slot refresh cycle';
COMMENT ON COLUMN users.openadp_metadata_b IS 'OpenADP metadata slot B - part of two-slot refresh cycle';
COMMENT ON COLUMN users.openadp_metadata_current IS 'Flag: TRUE=use slot A, FALSE=use slot B';
