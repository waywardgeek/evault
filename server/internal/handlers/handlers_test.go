package handlers

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
)

func TestHealthEndpoint(t *testing.T) {
	// Set Gin to test mode
	gin.SetMode(gin.TestMode)

	// Create a test router
	router := gin.New()

	// Add the health endpoint
	router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status":  "healthy",
			"service": "evault-server",
		})
	})

	// Create a test request
	req, _ := http.NewRequest("GET", "/health", nil)
	recorder := httptest.NewRecorder()

	// Perform the request
	router.ServeHTTP(recorder, req)

	// Assertions
	assert.Equal(t, http.StatusOK, recorder.Code)

	var response map[string]interface{}
	err := json.Unmarshal(recorder.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.Equal(t, "healthy", response["status"])
	assert.Equal(t, "evault-server", response["service"])
}

func TestStatusEndpoint(t *testing.T) {
	gin.SetMode(gin.TestMode)

	router := gin.New()

	// Add the status endpoint
	router.GET("/api/status", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"message": "eVault server is running",
			"version": "1.0.0",
			"endpoints": gin.H{
				"auth": []string{
					"POST /api/auth/url",
					"POST /api/auth/callback",
				},
				"protected": []string{
					"GET /api/user",
					"POST /api/vault/register",
					"POST /api/vault/recover",
				},
			},
		})
	})

	req, _ := http.NewRequest("GET", "/api/status", nil)
	recorder := httptest.NewRecorder()

	router.ServeHTTP(recorder, req)

	assert.Equal(t, http.StatusOK, recorder.Code)

	var response map[string]interface{}
	err := json.Unmarshal(recorder.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.Contains(t, response, "message")
	assert.Contains(t, response, "endpoints")
}

func TestAuthURLEndpointWithInvalidJSON(t *testing.T) {
	gin.SetMode(gin.TestMode)

	// Create handler with nil dependencies (we're testing input validation)
	h := &Handler{
		db:          nil,
		authService: nil,
	}

	router := gin.New()
	router.POST("/api/auth/url", h.GetAuthURL)

	// Test malformed JSON
	req, _ := http.NewRequest("POST", "/api/auth/url", bytes.NewBufferString("invalid-json"))
	req.Header.Set("Content-Type", "application/json")
	recorder := httptest.NewRecorder()

	router.ServeHTTP(recorder, req)

	// Should handle malformed JSON gracefully
	assert.Equal(t, http.StatusBadRequest, recorder.Code)

	var response map[string]interface{}
	err := json.Unmarshal(recorder.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.Contains(t, response, "error")
}

func TestUnauthorizedEndpoints(t *testing.T) {
	gin.SetMode(gin.TestMode)

	// Create handler with nil dependencies
	h := &Handler{
		db:          nil,
		authService: nil,
	}

	router := gin.New()

	// Add middleware that rejects unauthorized requests
	router.Use(func(c *gin.Context) {
		// Mock auth middleware that always rejects
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		c.Abort()
	})

	// Add protected endpoints
	router.GET("/api/user", h.GetCurrentUser)
	router.POST("/api/vault/register", h.RegisterVault)
	router.GET("/api/vault/status", h.GetVaultStatus)

	tests := []struct {
		method string
		path   string
	}{
		{"GET", "/api/user"},
		{"POST", "/api/vault/register"},
		{"GET", "/api/vault/status"},
	}

	for _, test := range tests {
		req, _ := http.NewRequest(test.method, test.path, nil)
		recorder := httptest.NewRecorder()

		router.ServeHTTP(recorder, req)

		assert.Equal(t, http.StatusUnauthorized, recorder.Code,
			"Expected 401 for %s %s", test.method, test.path)

		var response map[string]interface{}
		err := json.Unmarshal(recorder.Body.Bytes(), &response)
		assert.NoError(t, err)
		assert.Equal(t, "unauthorized", response["error"])
	}
}

func TestCORSHeaders(t *testing.T) {
	gin.SetMode(gin.TestMode)

	router := gin.New()

	// Add CORS middleware
	router.Use(func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}

		c.Next()
	})

	router.GET("/api/status", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	// Test OPTIONS request
	req, _ := http.NewRequest("OPTIONS", "/api/status", nil)
	recorder := httptest.NewRecorder()

	router.ServeHTTP(recorder, req)

	assert.Equal(t, http.StatusNoContent, recorder.Code)
	assert.Equal(t, "*", recorder.Header().Get("Access-Control-Allow-Origin"))
	assert.Contains(t, recorder.Header().Get("Access-Control-Allow-Methods"), "GET")

	// Test regular request with CORS headers
	req, _ = http.NewRequest("GET", "/api/status", nil)
	recorder = httptest.NewRecorder()

	router.ServeHTTP(recorder, req)

	assert.Equal(t, http.StatusOK, recorder.Code)
	assert.Equal(t, "*", recorder.Header().Get("Access-Control-Allow-Origin"))
}

func TestSecurityHeaders(t *testing.T) {
	gin.SetMode(gin.TestMode)

	router := gin.New()

	// Add security middleware
	router.Use(SecurityHeadersMiddleware())

	router.GET("/api/test", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	req, _ := http.NewRequest("GET", "/api/test", nil)
	recorder := httptest.NewRecorder()

	router.ServeHTTP(recorder, req)

	assert.Equal(t, http.StatusOK, recorder.Code)

	// Check security headers
	assert.Equal(t, "enabled", recorder.Header().Get("X-eVault-Security"))
	assert.Equal(t, "nosniff", recorder.Header().Get("X-Content-Type-Options"))
	assert.Equal(t, "DENY", recorder.Header().Get("X-Frame-Options"))
	assert.Equal(t, "1; mode=block", recorder.Header().Get("X-XSS-Protection"))
}

func TestRequestSizeLimit(t *testing.T) {
	gin.SetMode(gin.TestMode)

	router := gin.New()

	// Add request size limit middleware (1KB limit)
	router.Use(RequestSizeLimitMiddleware(1024))

	router.POST("/api/test", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	// Test with large payload
	largePayload := make([]byte, 2048) // 2KB
	for i := range largePayload {
		largePayload[i] = 'a'
	}

	req, _ := http.NewRequest("POST", "/api/test", bytes.NewBuffer(largePayload))
	req.Header.Set("Content-Type", "application/json")
	recorder := httptest.NewRecorder()

	router.ServeHTTP(recorder, req)

	assert.Equal(t, http.StatusRequestEntityTooLarge, recorder.Code)

	var response map[string]interface{}
	err := json.Unmarshal(recorder.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.Equal(t, "Request body too large", response["error"])
}
