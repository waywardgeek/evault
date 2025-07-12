# New Simplified Database Schema for eVault

## Overview

The new database schema simplifies user management by:
1. Using email as the primary user identifier
2. Removing unnecessary vault_public_key (OpenADP handles key management)
3. Tracking only the most recent OAuth provider (for support/debugging)
4. Maintaining the two-slot OpenADP metadata refresh system

## Schema

### Users Table

```sql
CREATE TABLE users (
    -- Primary key (kept as string for backward compatibility)
    user_id VARCHAR(255) PRIMARY KEY,
    
    -- Email is the real identifier (unique constraint)
    email VARCHAR(255) UNIQUE NOT NULL,
    
    -- Optional phone number for future 2FA
    phone_number VARCHAR(20),
    
    -- Most recent OAuth provider used (google, apple, etc)
    auth_provider VARCHAR(50) NOT NULL,
    
    -- Email verification status
    verified BOOLEAN DEFAULT FALSE,
    
    -- OpenADP two-slot metadata system
    openadp_metadata_a TEXT,
    openadp_metadata_b TEXT,
    openadp_metadata_current BOOLEAN DEFAULT TRUE,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_openadp_current ON users(openadp_metadata_current);
```

### Entries Table (unchanged)

```sql
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

CREATE INDEX idx_entries_user_id ON entries(user_id);
```

## Key Changes

### 1. Removed vault_public_key
- **Why**: OpenADP handles all key management internally
- **Impact**: Simpler schema, less data to manage
- **Migration**: Just DROP COLUMN

### 2. Email-based identification
- **Why**: Prevents duplicate accounts when using different OAuth providers
- **Impact**: Same email = same vault, regardless of sign-in method
- **Migration**: Add UNIQUE constraint to email

### 3. Track most recent auth provider only
- **Why**: Useful for support/debugging without storing unnecessary history
- **Impact**: Simple UPDATE on each login
- **Example**: User signs in with Google, then Apple → auth_provider = 'apple'

## Authentication Flow

```
1. User signs in with Google/Apple
2. Server validates OAuth token, extracts email
3. Server looks up user by email:
   - Found: Update auth_provider to current provider
   - Not found: Create new user with email and provider
4. Generate JWT with user_id
5. All API calls use JWT (no OAuth tokens stored or reused)
```

## Benefits

1. **Simpler**: Minimal data storage
2. **Unified accounts**: One account per email
3. **Debugging-friendly**: Know the last login method
4. **Future-proof**: Easy to add more providers
5. **Privacy**: No OAuth provider IDs or history stored

## Migration Path

1. Run migration 003_simplify_user_schema.sql
2. Update authentication handler to:
   - Look up users by email (not provider ID)
   - Update auth_provider on each login
3. Test with both Google and Apple sign-in

## Implementation Example

```go
// In HandleCallback
user, err := h.db.GetUserByEmail(email)
if err != nil {
    // Create new user
    user = &User{
        UserID: generateID(),
        Email: email,
        AuthProvider: provider, // 'google' or 'apple'
    }
    h.db.CreateUser(user)
} else {
    // Update last used provider
    h.db.UpdateAuthProvider(user.UserID, provider)
}
```

## Future Considerations

- Switch user_id to UUID for better standardization
- Add support for passwordless email authentication
- Add 2FA via phone number
- Consider rate limiting by email to prevent abuse 