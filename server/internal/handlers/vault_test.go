package handlers

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"evault-server/internal/auth"
	"evault-server/internal/database"

	"github.com/gin-gonic/gin"
	_ "github.com/lib/pq"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// Test database setup for vault tests
func setupVaultTestDB(t *testing.T) *database.Service {
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
	service := database.NewService(db)

	// Run migrations for test database
	err = service.RunMigrations()
	require.NoError(t, err, "Failed to run migrations")

	return service
}

func getEnvOrDefault(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func teardownVaultTestDB(t *testing.T, service *database.Service) {
	// Clean up test data
	service.DB().Exec("DELETE FROM entries")
	service.DB().Exec("DELETE FROM users")
	service.DB().Close()
}

// Setup test handler with real database
func setupTestHandler(t *testing.T) (*Handler, *database.Service) {
	dbService := setupVaultTestDB(t)

	// Create auth service with test values
	authService := auth.NewAuthService(
		"test-client-id",
		"test-client-secret",
		"http://localhost:3000/auth/callback",
		"test-jwt-secret",
	)

	handler := NewHandler(dbService, authService)
	return handler, dbService
}

// Create test user and return JWT token
func createTestUserWithJWT(t *testing.T, handler *Handler, userID, email string) string {
	// Create user in database
	user := &database.User{
		UserID:       userID,
		Email:        email,
		AuthProvider: "google",
		Verified:     true,
	}

	err := handler.db.CreateUser(user)
	require.NoError(t, err, "Failed to create test user")

	// Generate JWT token
	token, err := handler.authService.GenerateJWT(userID, email)
	require.NoError(t, err, "Failed to generate JWT token")

	return token
}

// Test the complete vault registration and metadata refresh flow
func TestVaultRegisterAndRefreshFlow(t *testing.T) {
	gin.SetMode(gin.TestMode)

	handler, dbService := setupTestHandler(t)
	defer teardownVaultTestDB(t, dbService)

	router := gin.New()
	router.Use(handler.AuthMiddleware())
	router.POST("/vault/register", handler.RegisterVault)
	router.POST("/vault/recover", handler.RecoverVault)
	router.POST("/vault/refresh", handler.RefreshMetadata)
	router.GET("/vault/status", handler.GetVaultStatus)

	// Create test user and JWT
	userID := "test-vault-user-123"
	email := "vault-test@example.com"
	token := createTestUserWithJWT(t, handler, userID, email)

	t.Run("Vault registration flow", func(t *testing.T) {
		// Test 1: Check initial vault status (should be false)
		req, _ := http.NewRequest("GET", "/vault/status", nil)
		req.Header.Set("Authorization", "Bearer "+token)
		recorder := httptest.NewRecorder()
		router.ServeHTTP(recorder, req)

		assert.Equal(t, http.StatusOK, recorder.Code)
		var statusResponse map[string]interface{}
		err := json.Unmarshal(recorder.Body.Bytes(), &statusResponse)
		require.NoError(t, err)
		assert.False(t, statusResponse["has_vault"].(bool))
		assert.Nil(t, statusResponse["openadp_metadata"])

		// Test 2: Register new vault
		registerRequest := RegisterVaultRequest{
			Pin:             "test1234",
			OpenADPMetadata: "initial-openadp-metadata-base64-encoded",
		}

		reqBody, _ := json.Marshal(registerRequest)
		req, _ = http.NewRequest("POST", "/vault/register", bytes.NewBuffer(reqBody))
		req.Header.Set("Authorization", "Bearer "+token)
		req.Header.Set("Content-Type", "application/json")
		recorder = httptest.NewRecorder()
		router.ServeHTTP(recorder, req)

		assert.Equal(t, http.StatusOK, recorder.Code)
		var registerResponse RegisterVaultResponse
		err = json.Unmarshal(recorder.Body.Bytes(), &registerResponse)
		require.NoError(t, err)
		assert.True(t, registerResponse.Success)

		// Test 3: Check vault status after registration (should be true)
		req, _ = http.NewRequest("GET", "/vault/status", nil)
		req.Header.Set("Authorization", "Bearer "+token)
		recorder = httptest.NewRecorder()
		router.ServeHTTP(recorder, req)

		assert.Equal(t, http.StatusOK, recorder.Code)
		err = json.Unmarshal(recorder.Body.Bytes(), &statusResponse)
		require.NoError(t, err)
		assert.True(t, statusResponse["has_vault"].(bool))
		assert.Equal(t, "initial-openadp-metadata-base64-encoded", statusResponse["openadp_metadata"].(string))

		// Test 4: Recover vault (should return same metadata)
		recoverRequest := RecoverVaultRequest{
			Pin: "test1234",
		}

		reqBody, _ = json.Marshal(recoverRequest)
		req, _ = http.NewRequest("POST", "/vault/recover", bytes.NewBuffer(reqBody))
		req.Header.Set("Authorization", "Bearer "+token)
		req.Header.Set("Content-Type", "application/json")
		recorder = httptest.NewRecorder()
		router.ServeHTTP(recorder, req)

		assert.Equal(t, http.StatusOK, recorder.Code)
		var recoverResponse RecoverVaultResponse
		err = json.Unmarshal(recorder.Body.Bytes(), &recoverResponse)
		require.NoError(t, err)
		assert.True(t, recoverResponse.Success)
		assert.Equal(t, "initial-openadp-metadata-base64-encoded", recoverResponse.OpenADPMetadata)
	})

	t.Run("Metadata refresh cycle flow", func(t *testing.T) {
		// Test 1: First metadata refresh
		refreshRequest := RefreshMetadataRequest{
			UpdatedMetadata: "refreshed-metadata-1-base64-encoded",
		}

		reqBody, _ := json.Marshal(refreshRequest)
		req, _ := http.NewRequest("POST", "/vault/refresh", bytes.NewBuffer(reqBody))
		req.Header.Set("Authorization", "Bearer "+token)
		req.Header.Set("Content-Type", "application/json")
		recorder := httptest.NewRecorder()
		router.ServeHTTP(recorder, req)

		assert.Equal(t, http.StatusOK, recorder.Code)
		var refreshResponse RefreshMetadataResponse
		err := json.Unmarshal(recorder.Body.Bytes(), &refreshResponse)
		require.NoError(t, err)
		assert.True(t, refreshResponse.Success)

		// Verify vault status returns new metadata
		req, _ = http.NewRequest("GET", "/vault/status", nil)
		req.Header.Set("Authorization", "Bearer "+token)
		recorder = httptest.NewRecorder()
		router.ServeHTTP(recorder, req)

		assert.Equal(t, http.StatusOK, recorder.Code)
		var statusResponse map[string]interface{}
		err = json.Unmarshal(recorder.Body.Bytes(), &statusResponse)
		require.NoError(t, err)
		assert.True(t, statusResponse["has_vault"].(bool))
		assert.Equal(t, "refreshed-metadata-1-base64-encoded", statusResponse["openadp_metadata"].(string))

		// Test 2: Second metadata refresh
		refreshRequest.UpdatedMetadata = "refreshed-metadata-2-base64-encoded"
		reqBody, _ = json.Marshal(refreshRequest)
		req, _ = http.NewRequest("POST", "/vault/refresh", bytes.NewBuffer(reqBody))
		req.Header.Set("Authorization", "Bearer "+token)
		req.Header.Set("Content-Type", "application/json")
		recorder = httptest.NewRecorder()
		router.ServeHTTP(recorder, req)

		assert.Equal(t, http.StatusOK, recorder.Code)
		err = json.Unmarshal(recorder.Body.Bytes(), &refreshResponse)
		require.NoError(t, err)
		assert.True(t, refreshResponse.Success)

		// Verify vault status returns newest metadata
		req, _ = http.NewRequest("GET", "/vault/status", nil)
		req.Header.Set("Authorization", "Bearer "+token)
		recorder = httptest.NewRecorder()
		router.ServeHTTP(recorder, req)

		assert.Equal(t, http.StatusOK, recorder.Code)
		err = json.Unmarshal(recorder.Body.Bytes(), &statusResponse)
		require.NoError(t, err)
		assert.True(t, statusResponse["has_vault"].(bool))
		assert.Equal(t, "refreshed-metadata-2-base64-encoded", statusResponse["openadp_metadata"].(string))

		// Test 3: Vault recovery returns newest metadata
		recoverRequest := RecoverVaultRequest{
			Pin: "test1234",
		}

		reqBody, _ = json.Marshal(recoverRequest)
		req, _ = http.NewRequest("POST", "/vault/recover", bytes.NewBuffer(reqBody))
		req.Header.Set("Authorization", "Bearer "+token)
		req.Header.Set("Content-Type", "application/json")
		recorder = httptest.NewRecorder()
		router.ServeHTTP(recorder, req)

		assert.Equal(t, http.StatusOK, recorder.Code)
		var recoverResponse RecoverVaultResponse
		err = json.Unmarshal(recorder.Body.Bytes(), &recoverResponse)
		require.NoError(t, err)
		assert.True(t, recoverResponse.Success)
		assert.Equal(t, "refreshed-metadata-2-base64-encoded", recoverResponse.OpenADPMetadata)
	})

	t.Run("Multiple refresh cycles (verify alternating pattern)", func(t *testing.T) {
		// Perform multiple refreshes and verify each returns current metadata
		for i := 3; i <= 10; i++ {
			refreshMetadata := fmt.Sprintf("refresh-cycle-%d-base64", i)

			refreshRequest := RefreshMetadataRequest{
				UpdatedMetadata: refreshMetadata,
			}

			reqBody, _ := json.Marshal(refreshRequest)
			req, _ := http.NewRequest("POST", "/vault/refresh", bytes.NewBuffer(reqBody))
			req.Header.Set("Authorization", "Bearer "+token)
			req.Header.Set("Content-Type", "application/json")
			recorder := httptest.NewRecorder()
			router.ServeHTTP(recorder, req)

			assert.Equal(t, http.StatusOK, recorder.Code, "Refresh %d failed", i)

			// Verify vault status returns the newest metadata
			req, _ = http.NewRequest("GET", "/vault/status", nil)
			req.Header.Set("Authorization", "Bearer "+token)
			recorder = httptest.NewRecorder()
			router.ServeHTTP(recorder, req)

			assert.Equal(t, http.StatusOK, recorder.Code)
			var statusResponse map[string]interface{}
			err := json.Unmarshal(recorder.Body.Bytes(), &statusResponse)
			require.NoError(t, err)
			assert.Equal(t, refreshMetadata, statusResponse["openadp_metadata"].(string), "Cycle %d metadata mismatch", i)
		}
	})
}

// Test error conditions for vault operations
func TestVaultErrorConditions(t *testing.T) {
	gin.SetMode(gin.TestMode)

	handler, dbService := setupTestHandler(t)
	defer teardownVaultTestDB(t, dbService)

	router := gin.New()
	router.Use(handler.AuthMiddleware())
	router.POST("/vault/register", handler.RegisterVault)
	router.POST("/vault/recover", handler.RecoverVault)
	router.POST("/vault/refresh", handler.RefreshMetadata)
	router.GET("/vault/status", handler.GetVaultStatus)

	// Create test user and JWT
	userID := "test-error-user-123"
	email := "error-test@example.com"
	token := createTestUserWithJWT(t, handler, userID, email)

	t.Run("Vault registration validation errors", func(t *testing.T) {
		// Test invalid JSON
		req, _ := http.NewRequest("POST", "/vault/register", bytes.NewBufferString("invalid-json"))
		req.Header.Set("Authorization", "Bearer "+token)
		req.Header.Set("Content-Type", "application/json")
		recorder := httptest.NewRecorder()
		router.ServeHTTP(recorder, req)

		assert.Equal(t, http.StatusBadRequest, recorder.Code)

		// Test PIN too short
		registerRequest := RegisterVaultRequest{
			Pin:             "123", // Too short
			OpenADPMetadata: "metadata",
		}

		reqBody, _ := json.Marshal(registerRequest)
		req, _ = http.NewRequest("POST", "/vault/register", bytes.NewBuffer(reqBody))
		req.Header.Set("Authorization", "Bearer "+token)
		req.Header.Set("Content-Type", "application/json")
		recorder = httptest.NewRecorder()
		router.ServeHTTP(recorder, req)

		assert.Equal(t, http.StatusBadRequest, recorder.Code)
		var response map[string]interface{}
		err := json.Unmarshal(recorder.Body.Bytes(), &response)
		require.NoError(t, err)
		assert.Contains(t, response["error"].(string), "PIN must be at least 4 characters")
	})

	t.Run("Duplicate vault registration", func(t *testing.T) {
		// Register vault first time
		registerRequest := RegisterVaultRequest{
			Pin:             "test1234",
			OpenADPMetadata: "first-metadata",
		}

		reqBody, _ := json.Marshal(registerRequest)
		req, _ := http.NewRequest("POST", "/vault/register", bytes.NewBuffer(reqBody))
		req.Header.Set("Authorization", "Bearer "+token)
		req.Header.Set("Content-Type", "application/json")
		recorder := httptest.NewRecorder()
		router.ServeHTTP(recorder, req)

		assert.Equal(t, http.StatusOK, recorder.Code)

		// Try to register again (should fail)
		registerRequest.OpenADPMetadata = "second-metadata"
		reqBody, _ = json.Marshal(registerRequest)
		req, _ = http.NewRequest("POST", "/vault/register", bytes.NewBuffer(reqBody))
		req.Header.Set("Authorization", "Bearer "+token)
		req.Header.Set("Content-Type", "application/json")
		recorder = httptest.NewRecorder()
		router.ServeHTTP(recorder, req)

		assert.Equal(t, http.StatusConflict, recorder.Code)
		var response map[string]interface{}
		err := json.Unmarshal(recorder.Body.Bytes(), &response)
		require.NoError(t, err)
		assert.Contains(t, response["error"].(string), "already has a vault registered")
	})

	t.Run("Operations on non-existent vault", func(t *testing.T) {
		// Create new user without vault
		newUserID := "user-without-vault"
		newEmail := "novault@example.com"
		newToken := createTestUserWithJWT(t, handler, newUserID, newEmail)

		// Try to recover vault that doesn't exist
		recoverRequest := RecoverVaultRequest{
			Pin: "test1234",
		}

		reqBody, _ := json.Marshal(recoverRequest)
		req, _ := http.NewRequest("POST", "/vault/recover", bytes.NewBuffer(reqBody))
		req.Header.Set("Authorization", "Bearer "+newToken)
		req.Header.Set("Content-Type", "application/json")
		recorder := httptest.NewRecorder()
		router.ServeHTTP(recorder, req)

		assert.Equal(t, http.StatusNotFound, recorder.Code)
		var response map[string]interface{}
		err := json.Unmarshal(recorder.Body.Bytes(), &response)
		require.NoError(t, err)
		assert.Contains(t, response["error"].(string), "no vault registered")

		// Try to refresh metadata for vault that doesn't exist
		refreshRequest := RefreshMetadataRequest{
			UpdatedMetadata: "some-metadata",
		}

		reqBody, _ = json.Marshal(refreshRequest)
		req, _ = http.NewRequest("POST", "/vault/refresh", bytes.NewBuffer(reqBody))
		req.Header.Set("Authorization", "Bearer "+newToken)
		req.Header.Set("Content-Type", "application/json")
		recorder = httptest.NewRecorder()
		router.ServeHTTP(recorder, req)

		assert.Equal(t, http.StatusBadRequest, recorder.Code)
		err = json.Unmarshal(recorder.Body.Bytes(), &response)
		require.NoError(t, err)
		assert.Contains(t, response["error"].(string), "Vault not registered")
	})

	t.Run("Unauthorized requests", func(t *testing.T) {
		// Test without JWT token
		req, _ := http.NewRequest("GET", "/vault/status", nil)
		recorder := httptest.NewRecorder()
		router.ServeHTTP(recorder, req)

		assert.Equal(t, http.StatusUnauthorized, recorder.Code)

		// Test with invalid JWT token
		req, _ = http.NewRequest("GET", "/vault/status", nil)
		req.Header.Set("Authorization", "Bearer invalid-token")
		recorder = httptest.NewRecorder()
		router.ServeHTTP(recorder, req)

		assert.Equal(t, http.StatusUnauthorized, recorder.Code)
	})
}

// Test the database consistency during concurrent metadata operations
func TestVaultConcurrentMetadataUpdates(t *testing.T) {
	gin.SetMode(gin.TestMode)

	handler, dbService := setupTestHandler(t)
	defer teardownVaultTestDB(t, dbService)

	router := gin.New()
	router.Use(handler.AuthMiddleware())
	router.POST("/vault/register", handler.RegisterVault)
	router.POST("/vault/refresh", handler.RefreshMetadata)
	router.GET("/vault/status", handler.GetVaultStatus)

	// Create test user and JWT
	userID := "concurrent-test-user"
	email := "concurrent@example.com"
	token := createTestUserWithJWT(t, handler, userID, email)

	// Register initial vault
	registerRequest := RegisterVaultRequest{
		Pin:             "test1234",
		OpenADPMetadata: "initial-metadata",
	}

	reqBody, _ := json.Marshal(registerRequest)
	req, _ := http.NewRequest("POST", "/vault/register", bytes.NewBuffer(reqBody))
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")
	recorder := httptest.NewRecorder()
	router.ServeHTTP(recorder, req)

	require.Equal(t, http.StatusOK, recorder.Code)

	t.Run("Concurrent metadata refreshes", func(t *testing.T) {
		const numConcurrentRequests = 20
		resultsChan := make(chan int, numConcurrentRequests)

		// Send concurrent refresh requests
		for i := 0; i < numConcurrentRequests; i++ {
			go func(index int) {
				refreshRequest := RefreshMetadataRequest{
					UpdatedMetadata: fmt.Sprintf("concurrent-metadata-%d", index),
				}

				reqBody, _ := json.Marshal(refreshRequest)
				req, _ := http.NewRequest("POST", "/vault/refresh", bytes.NewBuffer(reqBody))
				req.Header.Set("Authorization", "Bearer "+token)
				req.Header.Set("Content-Type", "application/json")
				recorder := httptest.NewRecorder()
				router.ServeHTTP(recorder, req)

				resultsChan <- recorder.Code
			}(i)
		}

		// Collect results
		successCount := 0
		for i := 0; i < numConcurrentRequests; i++ {
			code := <-resultsChan
			if code == http.StatusOK {
				successCount++
			}
		}

		// All requests should succeed
		assert.Equal(t, numConcurrentRequests, successCount, "All concurrent requests should succeed")

		// Verify final state is consistent
		req, _ := http.NewRequest("GET", "/vault/status", nil)
		req.Header.Set("Authorization", "Bearer "+token)
		recorder := httptest.NewRecorder()
		router.ServeHTTP(recorder, req)

		assert.Equal(t, http.StatusOK, recorder.Code)
		var statusResponse map[string]interface{}
		err := json.Unmarshal(recorder.Body.Bytes(), &statusResponse)
		require.NoError(t, err)
		assert.True(t, statusResponse["has_vault"].(bool))
		assert.NotNil(t, statusResponse["openadp_metadata"])

		// Verify database state is consistent
		user, err := dbService.GetUserByID(userID)
		require.NoError(t, err)

		currentMetadata, err := dbService.GetCurrentOpenADPMetadata(userID)
		require.NoError(t, err)
		require.NotNil(t, currentMetadata)

		// Verify the current flag points to the correct slot
		if user.OpenADPMetadataCurrent {
			assert.Equal(t, *currentMetadata, *user.OpenADPMetadataA)
		} else {
			assert.Equal(t, *currentMetadata, *user.OpenADPMetadataB)
		}
	})
}
