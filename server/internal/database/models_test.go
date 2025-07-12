package database

import (
	"database/sql"
	"fmt"
	"log"
	"os"
	"testing"
	"time"

	_ "github.com/lib/pq"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// Test database connection - uses separate test database
func setupTestDB(t *testing.T) *Service {
	// Use environment variables or defaults for test database
	host := getEnvOrDefault("TEST_DB_HOST", "localhost")
	port := getEnvOrDefault("TEST_DB_PORT", "5433")
	user := getEnvOrDefault("TEST_DB_USER", "postgres")
	password := getEnvOrDefault("TEST_DB_PASSWORD", "password")
	dbname := getEnvOrDefault("TEST_DB_NAME", "evault_test")
	sslmode := getEnvOrDefault("TEST_DB_SSLMODE", "disable")

	psqlInfo := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
		host, port, user, password, dbname, sslmode)

	db, err := sql.Open("postgres", psqlInfo)
	require.NoError(t, err, "Failed to connect to test database")

	err = db.Ping()
	require.NoError(t, err, "Failed to ping test database")

	// Create database service
	service := NewService(db)

	// Run migrations for test database
	// Note: We'll create the tables manually for testing to avoid path issues
	err = setupTestTables(service.DB())
	require.NoError(t, err, "Failed to setup test tables")

	return service
}

func getEnvOrDefault(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

// setupTestTables creates the required tables for testing
func setupTestTables(db *sql.DB) error {
	// Create users table with two-slot metadata system
	usersTable := `
	CREATE TABLE IF NOT EXISTS users (
		user_id VARCHAR(255) PRIMARY KEY,
		email VARCHAR(255) NOT NULL,
		phone_number VARCHAR(20),
		auth_provider VARCHAR(50) NOT NULL,
		verified BOOLEAN DEFAULT FALSE,
		openadp_metadata_a TEXT,
		openadp_metadata_b TEXT,
		openadp_metadata_current BOOLEAN DEFAULT TRUE,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	)`

	_, err := db.Exec(usersTable)
	if err != nil {
		return fmt.Errorf("failed to create users table: %w", err)
	}

	// Create entries table
	entriesTable := `
	CREATE TABLE IF NOT EXISTS entries (
		user_id VARCHAR(255) NOT NULL,
		name VARCHAR(255) NOT NULL,
		hpke_blob BYTEA NOT NULL,
		deletion_hash BYTEA NOT NULL,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		PRIMARY KEY (user_id, name),
		FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
	)`

	_, err = db.Exec(entriesTable)
	if err != nil {
		return fmt.Errorf("failed to create entries table: %w", err)
	}

	// Create indexes
	indexes := []string{
		"CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)",
		"CREATE INDEX IF NOT EXISTS idx_users_openadp_current ON users(openadp_metadata_current)",
		"CREATE INDEX IF NOT EXISTS idx_entries_user_id ON entries(user_id)",
	}

	for _, indexSQL := range indexes {
		_, err = db.Exec(indexSQL)
		if err != nil {
			return fmt.Errorf("failed to create index: %w", err)
		}
	}

	return nil
}

func teardownTestDB(t *testing.T, service *Service) {
	// Clean up test data
	_, err := service.db.Exec("DELETE FROM entries")
	if err != nil {
		log.Printf("Warning: Failed to clean up entries: %v", err)
	}

	_, err = service.db.Exec("DELETE FROM users")
	if err != nil {
		log.Printf("Warning: Failed to clean up users: %v", err)
	}

	service.db.Close()
}

// Test the two-slot OpenADP metadata system
func TestOpenADPMetadataRefreshCycle(t *testing.T) {
	service := setupTestDB(t)
	defer teardownTestDB(t, service)

	// Create a test user
	testUser := &User{
		UserID:       "test-user-123",
		Email:        "test@example.com",
		AuthProvider: "google",
		Verified:     true,
	}

	err := service.CreateUser(testUser)
	require.NoError(t, err, "Failed to create test user")

	// Test 1: Initial metadata should be nil
	t.Run("Initial metadata should be nil", func(t *testing.T) {
		metadata, err := service.GetCurrentOpenADPMetadata(testUser.UserID)
		require.NoError(t, err)
		assert.Nil(t, metadata, "Initial metadata should be nil")
	})

	// Test 2: Set initial metadata (should go to slot A, flag=true)
	t.Run("Set initial metadata", func(t *testing.T) {
		initialMetadata := "initial-metadata-base64"

		err := service.SetInitialOpenADPMetadata(testUser.UserID, initialMetadata)
		require.NoError(t, err, "Failed to set initial metadata")

		// Verify current metadata returns the initial metadata
		currentMetadata, err := service.GetCurrentOpenADPMetadata(testUser.UserID)
		require.NoError(t, err)
		require.NotNil(t, currentMetadata)
		assert.Equal(t, initialMetadata, *currentMetadata)

		// Verify database state: metadata_a should have data, metadata_b should be nil, current should be true
		user, err := service.GetUserByID(testUser.UserID)
		require.NoError(t, err)
		assert.NotNil(t, user.OpenADPMetadataA)
		assert.Equal(t, initialMetadata, *user.OpenADPMetadataA)
		assert.Nil(t, user.OpenADPMetadataB)
		assert.True(t, user.OpenADPMetadataCurrent)
	})

	// Test 3: First refresh (should write to slot B, flip flag to false)
	t.Run("First metadata refresh", func(t *testing.T) {
		refreshedMetadata1 := "refreshed-metadata-1-base64"

		err := service.UpdateUserOpenADPMetadata(testUser.UserID, refreshedMetadata1)
		require.NoError(t, err, "Failed to update metadata")

		// Verify current metadata returns the refreshed metadata
		currentMetadata, err := service.GetCurrentOpenADPMetadata(testUser.UserID)
		require.NoError(t, err)
		require.NotNil(t, currentMetadata)
		assert.Equal(t, refreshedMetadata1, *currentMetadata)

		// Verify database state: metadata_a should have old data, metadata_b should have new data, current should be false
		user, err := service.GetUserByID(testUser.UserID)
		require.NoError(t, err)
		assert.NotNil(t, user.OpenADPMetadataA)
		assert.Equal(t, "initial-metadata-base64", *user.OpenADPMetadataA) // Old data
		assert.NotNil(t, user.OpenADPMetadataB)
		assert.Equal(t, refreshedMetadata1, *user.OpenADPMetadataB) // New data
		assert.False(t, user.OpenADPMetadataCurrent)                // Flag flipped to false (use slot B)
	})

	// Test 4: Second refresh (should write to slot A, flip flag to true)
	t.Run("Second metadata refresh", func(t *testing.T) {
		refreshedMetadata2 := "refreshed-metadata-2-base64"

		err := service.UpdateUserOpenADPMetadata(testUser.UserID, refreshedMetadata2)
		require.NoError(t, err, "Failed to update metadata")

		// Verify current metadata returns the second refreshed metadata
		currentMetadata, err := service.GetCurrentOpenADPMetadata(testUser.UserID)
		require.NoError(t, err)
		require.NotNil(t, currentMetadata)
		assert.Equal(t, refreshedMetadata2, *currentMetadata)

		// Verify database state: metadata_a should have new data, metadata_b should have old data, current should be true
		user, err := service.GetUserByID(testUser.UserID)
		require.NoError(t, err)
		assert.NotNil(t, user.OpenADPMetadataA)
		assert.Equal(t, refreshedMetadata2, *user.OpenADPMetadataA) // New data
		assert.NotNil(t, user.OpenADPMetadataB)
		assert.Equal(t, "refreshed-metadata-1-base64", *user.OpenADPMetadataB) // Old data
		assert.True(t, user.OpenADPMetadataCurrent)                            // Flag flipped back to true (use slot A)
	})

	// Test 5: Third refresh (should write to slot B, flip flag to false)
	t.Run("Third metadata refresh", func(t *testing.T) {
		refreshedMetadata3 := "refreshed-metadata-3-base64"

		err := service.UpdateUserOpenADPMetadata(testUser.UserID, refreshedMetadata3)
		require.NoError(t, err, "Failed to update metadata")

		// Verify current metadata returns the third refreshed metadata
		currentMetadata, err := service.GetCurrentOpenADPMetadata(testUser.UserID)
		require.NoError(t, err)
		require.NotNil(t, currentMetadata)
		assert.Equal(t, refreshedMetadata3, *currentMetadata)

		// Verify database state: metadata_a should have old data, metadata_b should have new data, current should be false
		user, err := service.GetUserByID(testUser.UserID)
		require.NoError(t, err)
		assert.NotNil(t, user.OpenADPMetadataA)
		assert.Equal(t, "refreshed-metadata-2-base64", *user.OpenADPMetadataA) // Old data
		assert.NotNil(t, user.OpenADPMetadataB)
		assert.Equal(t, refreshedMetadata3, *user.OpenADPMetadataB) // New data
		assert.False(t, user.OpenADPMetadataCurrent)                // Flag flipped to false (use slot B)
	})

	// Test 6: Verify alternating pattern continues
	t.Run("Verify alternating pattern", func(t *testing.T) {
		// Get initial state
		user, err := service.GetUserByID(testUser.UserID)
		require.NoError(t, err)
		currentFlag := user.OpenADPMetadataCurrent

		// Perform multiple refreshes and verify alternating pattern
		for i := 0; i < 5; i++ {
			refreshedMetadata := fmt.Sprintf("refresh-cycle-%d-base64", i)

			err := service.UpdateUserOpenADPMetadata(testUser.UserID, refreshedMetadata)
			require.NoError(t, err, "Failed to update metadata in cycle %d", i)

			// Verify current metadata is correct
			currentMetadata, err := service.GetCurrentOpenADPMetadata(testUser.UserID)
			require.NoError(t, err)
			require.NotNil(t, currentMetadata)
			assert.Equal(t, refreshedMetadata, *currentMetadata)

			// Verify flag alternates
			user, err := service.GetUserByID(testUser.UserID)
			require.NoError(t, err)
			expectedFlag := !currentFlag
			assert.Equal(t, expectedFlag, user.OpenADPMetadataCurrent, "Flag should alternate on cycle %d", i)
			currentFlag = expectedFlag
		}
	})
}

// Test error conditions
func TestOpenADPMetadataErrorConditions(t *testing.T) {
	service := setupTestDB(t)
	defer teardownTestDB(t, service)

	// Test with non-existent user
	t.Run("Non-existent user", func(t *testing.T) {
		_, err := service.GetCurrentOpenADPMetadata("non-existent-user")
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "user not found")
	})

	// Test updating metadata for non-existent user
	t.Run("Update metadata for non-existent user", func(t *testing.T) {
		err := service.UpdateUserOpenADPMetadata("non-existent-user", "some-metadata")
		assert.NoError(t, err) // SQL UPDATE with no matches is not an error
	})

	// Test setting initial metadata for non-existent user
	t.Run("Set initial metadata for non-existent user", func(t *testing.T) {
		err := service.SetInitialOpenADPMetadata("non-existent-user", "some-metadata")
		assert.NoError(t, err) // SQL UPDATE with no matches is not an error
	})
}

// Test concurrent access (race condition protection)
func TestOpenADPMetadataConcurrentAccess(t *testing.T) {
	service := setupTestDB(t)
	defer teardownTestDB(t, service)

	// Create a test user
	testUser := &User{
		UserID:       "concurrent-test-user",
		Email:        "concurrent@example.com",
		AuthProvider: "google",
		Verified:     true,
	}

	err := service.CreateUser(testUser)
	require.NoError(t, err, "Failed to create test user")

	// Set initial metadata
	err = service.SetInitialOpenADPMetadata(testUser.UserID, "initial-metadata")
	require.NoError(t, err, "Failed to set initial metadata")

	// Simulate concurrent metadata updates
	t.Run("Concurrent metadata updates", func(t *testing.T) {
		const numGoroutines = 10
		const updatesPerGoroutine = 5

		// Channel to collect results
		resultsChan := make(chan error, numGoroutines*updatesPerGoroutine)

		// Start concurrent updates
		for i := 0; i < numGoroutines; i++ {
			go func(goroutineID int) {
				for j := 0; j < updatesPerGoroutine; j++ {
					metadata := fmt.Sprintf("concurrent-metadata-g%d-u%d", goroutineID, j)
					err := service.UpdateUserOpenADPMetadata(testUser.UserID, metadata)
					resultsChan <- err

					// Small delay to increase chance of race conditions
					time.Sleep(time.Millisecond)
				}
			}(i)
		}

		// Collect results
		for i := 0; i < numGoroutines*updatesPerGoroutine; i++ {
			err := <-resultsChan
			assert.NoError(t, err, "Concurrent update failed")
		}

		// Verify final state is consistent
		currentMetadata, err := service.GetCurrentOpenADPMetadata(testUser.UserID)
		require.NoError(t, err)
		require.NotNil(t, currentMetadata)

		// Just verify we can get the current metadata - exact value depends on race conditions
		user, err := service.GetUserByID(testUser.UserID)
		require.NoError(t, err)

		// Verify database consistency: exactly one of the slots should be current
		currentSlot := user.OpenADPMetadataCurrent
		if currentSlot {
			assert.Equal(t, *currentMetadata, *user.OpenADPMetadataA)
		} else {
			assert.Equal(t, *currentMetadata, *user.OpenADPMetadataB)
		}
	})
}

// Benchmark the metadata operations
func BenchmarkOpenADPMetadataOperations(b *testing.B) {
	service := setupTestDB(&testing.T{})
	defer teardownTestDB(&testing.T{}, service)

	// Create a test user
	testUser := &User{
		UserID:       "benchmark-user",
		Email:        "benchmark@example.com",
		AuthProvider: "google",
		Verified:     true,
	}

	err := service.CreateUser(testUser)
	if err != nil {
		b.Fatal("Failed to create test user:", err)
	}

	// Set initial metadata
	err = service.SetInitialOpenADPMetadata(testUser.UserID, "initial-metadata")
	if err != nil {
		b.Fatal("Failed to set initial metadata:", err)
	}

	// Benchmark metadata refresh operations
	b.Run("UpdateMetadata", func(b *testing.B) {
		for i := 0; i < b.N; i++ {
			metadata := fmt.Sprintf("benchmark-metadata-%d", i)
			err := service.UpdateUserOpenADPMetadata(testUser.UserID, metadata)
			if err != nil {
				b.Fatal("Failed to update metadata:", err)
			}
		}
	})

	// Benchmark metadata retrieval operations
	b.Run("GetCurrentMetadata", func(b *testing.B) {
		for i := 0; i < b.N; i++ {
			_, err := service.GetCurrentOpenADPMetadata(testUser.UserID)
			if err != nil {
				b.Fatal("Failed to get current metadata:", err)
			}
		}
	})
}
