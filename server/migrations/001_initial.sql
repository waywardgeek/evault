-- migrations/001_initial.sql
CREATE TABLE IF NOT EXISTS users (
    user_id VARCHAR(255) PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    phone_number VARCHAR(20),
    auth_provider VARCHAR(50) NOT NULL,
    verified BOOLEAN DEFAULT FALSE,
    openadp_metadata TEXT,              -- Base64 encoded OpenADP metadata from register()
    vault_public_key TEXT,              -- Base64 encoded HPKE public key for encryption
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS entries (
    user_id VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    hpke_blob BYTEA NOT NULL,
    deletion_hash BYTEA NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, name),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_entries_user_id ON entries(user_id); 