package database

import (
	"database/sql"
	"fmt"
	"testing"

	_ "github.com/lib/pq"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// Test the new simplified schema
func TestNewDatabaseSchema(t *testing.T) {
	db := setupNewTestDB(t)
	defer teardownTestDB(t, db)

	t.Run("CreateUserWithEmail", func(t *testing.T) {
		user := &User{
			UserID:       "test-user-1",
			Email:        "test@example.com",
			AuthProvider: "google",
			Verified:     true,
		}

		err := db.CreateUser(user)
		require.NoError(t, err)

		// Verify user was created
		retrieved, err := db.GetUserByEmail("test@example.com")
		require.NoError(t, err)
		assert.Equal(t, user.UserID, retrieved.UserID)
		assert.Equal(t, user.Email, retrieved.Email)
		assert.Equal(t, "google", retrieved.AuthProvider)
	})

	t.Run("EmailUniqueness", func(t *testing.T) {
		// Create first user
		user1 := &User{
			UserID:       "google-123",
			Email:        "same@example.com",
			AuthProvider: "google",
		}
		err := db.CreateUser(user1)
		require.NoError(t, err)

		// Try to create second user with same email
		user2 := &User{
			UserID:       "apple-456",
			Email:        "same@example.com",
			AuthProvider: "apple",
		}
		err = db.CreateUser(user2)
		assert.Error(t, err, "Should fail due to duplicate email")
	})

	t.Run("UpdateAuthProvider", func(t *testing.T) {
		// Create user with Google
		user := &User{
			UserID:       "multi-auth-user",
			Email:        "multi@example.com",
			AuthProvider: "google",
		}
		err := db.CreateUser(user)
		require.NoError(t, err)

		// Update to Apple
		err = db.UpdateAuthProvider(user.UserID, "apple")
		require.NoError(t, err)

		// Verify update
		retrieved, err := db.GetUserByEmail("multi@example.com")
		require.NoError(t, err)
		assert.Equal(t, "apple", retrieved.AuthProvider)
	})

	t.Run("NoVaultPublicKey", func(t *testing.T) {
		// Verify vault_public_key column doesn't exist
		var columnExists bool
		err := db.db.QueryRow(`
			SELECT EXISTS (
				SELECT 1 FROM information_schema.columns 
				WHERE table_name = 'users' 
				AND column_name = 'vault_public_key'
			)
		`).Scan(&columnExists)
		require.NoError(t, err)
		assert.False(t, columnExists, "vault_public_key column should not exist")
	})
}

// Test email-based user lookup for unified accounts
func TestEmailBasedAuthentication(t *testing.T) {
	db := setupNewTestDB(t)
	defer teardownTestDB(t, db)

	email := "unified@example.com"

	t.Run("CreateUserViaGoogle", func(t *testing.T) {
		// First sign-in with Google
		_, err := db.GetUserByEmail(email)
		assert.Error(t, err, "User should not exist yet")

		// Create user
		newUser := &User{
			UserID:       "google-" + email,
			Email:        email,
			AuthProvider: "google",
			Verified:     true,
		}
		err = db.CreateUser(newUser)
		require.NoError(t, err)
	})

	t.Run("SignInWithApple", func(t *testing.T) {
		// User signs in with Apple using same email
		user, err := db.GetUserByEmail(email)
		require.NoError(t, err)
		assert.Equal(t, "google", user.AuthProvider)

		// Update auth provider to Apple
		err = db.UpdateAuthProvider(user.UserID, "apple")
		require.NoError(t, err)

		// Verify same user, different provider
		user, err = db.GetUserByEmail(email)
		require.NoError(t, err)
		assert.Equal(t, "apple", user.AuthProvider)
		assert.Equal(t, email, user.Email)
	})
}

// Test OpenADP metadata operations remain unchanged
func TestOpenADPMetadataWithNewSchema(t *testing.T) {
	db := setupNewTestDB(t)
	defer teardownTestDB(t, db)

	userID := "metadata-test-user"

	// Create user
	user := &User{
		UserID:       userID,
		Email:        "metadata@example.com",
		AuthProvider: "google",
	}
	err := db.CreateUser(user)
	require.NoError(t, err)

	t.Run("InitialMetadata", func(t *testing.T) {
		metadata := "initial-metadata-base64"
		err := db.SetInitialOpenADPMetadata(userID, metadata)
		require.NoError(t, err)

		current, err := db.GetCurrentOpenADPMetadata(userID)
		require.NoError(t, err)
		assert.Equal(t, metadata, *current)
	})

	t.Run("MetadataRefreshCycle", func(t *testing.T) {
		// First refresh
		metadata2 := "refreshed-metadata-1"
		err := db.UpdateUserOpenADPMetadata(userID, metadata2)
		require.NoError(t, err)

		current, err := db.GetCurrentOpenADPMetadata(userID)
		require.NoError(t, err)
		assert.Equal(t, metadata2, *current)

		// Second refresh
		metadata3 := "refreshed-metadata-2"
		err = db.UpdateUserOpenADPMetadata(userID, metadata3)
		require.NoError(t, err)

		current, err = db.GetCurrentOpenADPMetadata(userID)
		require.NoError(t, err)
		assert.Equal(t, metadata3, *current)
	})
}

// Test entries table still works with new user schema
func TestEntriesWithNewSchema(t *testing.T) {
	db := setupNewTestDB(t)
	defer teardownTestDB(t, db)

	// Create user
	user := &User{
		UserID:       "entry-test-user",
		Email:        "entries@example.com",
		AuthProvider: "apple",
	}
	err := db.CreateUser(user)
	require.NoError(t, err)

	t.Run("CreateEntry", func(t *testing.T) {
		entry := &Entry{
			UserID:       user.UserID,
			Name:         "test-password",
			HPKEBlob:     []byte("encrypted-data"),
			DeletionHash: []byte("hash"),
		}
		err := db.CreateEntry(entry)
		require.NoError(t, err)
	})

	t.Run("GetEntries", func(t *testing.T) {
		entries, err := db.GetEntriesByUserID(user.UserID)
		require.NoError(t, err)
		assert.Len(t, entries, 1)
		assert.Equal(t, "test-password", entries[0].Name)
	})

	t.Run("CascadeDelete", func(t *testing.T) {
		// Delete user should cascade delete entries
		err := db.DeleteUser(user.UserID)
		require.NoError(t, err)

		// Verify entries are gone
		entries, err := db.GetEntriesByUserID(user.UserID)
		require.NoError(t, err)
		assert.Len(t, entries, 0)
	})
}

// Test migration scenarios
func TestMigrationScenarios(t *testing.T) {
	db := setupNewTestDB(t)
	defer teardownTestDB(t, db)

	t.Run("HandleDuplicateEmails", func(t *testing.T) {
		// Simulate existing database with duplicate emails
		// (This would be handled by migration script in production)

		// For new database, ensure we can't create duplicates
		user1 := &User{
			UserID:       "dup-1",
			Email:        "duplicate@example.com",
			AuthProvider: "google",
		}
		err := db.CreateUser(user1)
		require.NoError(t, err)

		user2 := &User{
			UserID:       "dup-2",
			Email:        "duplicate@example.com",
			AuthProvider: "apple",
		}
		err = db.CreateUser(user2)
		assert.Error(t, err, "Should prevent duplicate emails")
	})
}

// Helper to set up test database with new schema
func setupNewTestDB(t *testing.T) *Service {
	// Use environment variables or defaults for test database
	host := getEnvOrDefault("TEST_DB_HOST", "localhost")
	port := getEnvOrDefault("TEST_DB_PORT", "5433")
	user := getEnvOrDefault("TEST_DB_USER", "postgres")
	password := getEnvOrDefault("TEST_DB_PASSWORD", "password")
	dbname := getEnvOrDefault("TEST_DB_NAME", "evault_new_test")
	sslmode := getEnvOrDefault("TEST_DB_SSLMODE", "disable")

	psqlInfo := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
		host, port, user, password, dbname, sslmode)

	db, err := sql.Open("postgres", psqlInfo)
	require.NoError(t, err, "Failed to connect to test database")

	err = db.Ping()
	require.NoError(t, err, "Failed to ping test database")

	// Create database service
	service := NewService(db)

	// Create tables with new schema
	err = setupNewTestTables(service.DB())
	require.NoError(t, err, "Failed to setup test tables")

	return service
}

// Create tables with new simplified schema
func setupNewTestTables(db *sql.DB) error {
	// Create users table WITHOUT vault_public_key
	usersTable := `
	DROP TABLE IF EXISTS entries CASCADE;
	DROP TABLE IF EXISTS users CASCADE;
	
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

	CREATE INDEX idx_users_email ON users(email);
	CREATE INDEX idx_users_openadp_current ON users(openadp_metadata_current);
	`

	_, err := db.Exec(usersTable)
	if err != nil {
		return fmt.Errorf("failed to create users table: %w", err)
	}

	// Create entries table
	entriesTable := `
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
	`

	_, err = db.Exec(entriesTable)
	if err != nil {
		return fmt.Errorf("failed to create entries table: %w", err)
	}

	return nil
}
