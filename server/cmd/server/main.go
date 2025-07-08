package main

import (
	"database/sql"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	"evault-server/internal/auth"
	"evault-server/internal/database"
	"evault-server/internal/handlers"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	_ "github.com/lib/pq"
)

func main() {
	// Load environment variables
	if err := godotenv.Load(); err != nil {
		log.Printf("Warning: .env file not found: %v", err)
	}

	// Database connection
	db, err := connectDB()
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}
	defer db.Close()

	// Initialize database
	dbService := database.NewService(db)
	if err := dbService.RunMigrations(); err != nil {
		log.Fatal("Failed to run migrations:", err)
	}

	// Initialize auth service
	authService := auth.NewAuthService(
		getEnv("GOOGLE_CLIENT_ID", ""),
		getEnv("GOOGLE_CLIENT_SECRET", ""),
		"", // No redirect URL needed - NextAuth handles OAuth redirects
		getEnv("JWT_SECRET", "your-secret-key-change-this-in-production"),
	)

	// Initialize handlers
	handler := handlers.NewHandler(dbService, authService)

	// Initialize rate limiter
	rateLimiter := handlers.NewRateLimiter()

	// Setup Gin router
	router := setupRouter(handler, rateLimiter)

	// Start server
	port := getEnv("PORT", "8080")
	log.Printf("Server starting on port %s", port)
	if err := router.Run(":" + port); err != nil {
		log.Fatal("Failed to start server:", err)
	}
}

func connectDB() (*sql.DB, error) {
	host := getEnv("DB_HOST", "localhost")
	port := getEnv("DB_PORT", "5432")
	user := getEnv("DB_USER", "postgres")
	password := getEnv("DB_PASSWORD", "password")
	dbname := getEnv("DB_NAME", "evault")
	sslmode := getEnv("DB_SSLMODE", "disable")

	psqlInfo := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
		host, port, user, password, dbname, sslmode)

	db, err := sql.Open("postgres", psqlInfo)
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	if err = db.Ping(); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	return db, nil
}

func setupRouter(handler *handlers.Handler, rateLimiter *handlers.RateLimiter) *gin.Engine {
	// Set Gin mode
	if getEnv("ENV", "development") == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	router := gin.Default()

	// Rate limiting middleware (100 requests per minute)
	router.Use(handlers.RateLimitMiddleware(rateLimiter, 100, time.Minute))

	// Request size limit middleware
	router.Use(handlers.RequestSizeLimitMiddleware(10 * 1024 * 1024)) // 10MB limit

	// CORS middleware
	router.Use(func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, DELETE")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	})

	// Security headers middleware (after CORS to avoid being overridden)
	router.Use(handlers.SecurityHeadersMiddleware())

	// Health check endpoint
	router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status":  "healthy",
			"service": "evault-server",
		})
	})

	// API routes
	api := router.Group("/api")
	{
		// Public authentication routes (Phase 2)
		auth := api.Group("/auth")
		{
			auth.POST("/url", handler.GetAuthURL)                // Get Google OAuth URL
			auth.POST("/callback", handler.HandleCallback)       // Handle OAuth callback
			auth.GET("/callback", handler.HandleCallback)        // Support GET for browser redirects
			auth.GET("/callback/google", handler.HandleCallback) // Support NextAuth Google callback
		}

		// Protected routes (require authentication)
		protected := api.Group("/")
		protected.Use(handler.AuthMiddleware())
		{
			// User routes
			protected.GET("user", handler.GetCurrentUser)          // Get current user info
			protected.POST("user/refresh", handler.RefreshToken)   // Refresh JWT token
			protected.DELETE("user/delete", handler.DeleteAccount) // Delete user account

			// Vault routes (Phase 3)
			protected.POST("vault/register", handler.RegisterVault)
			protected.POST("vault/recover", handler.RecoverVault)
			protected.POST("vault/refresh", handler.RefreshMetadata)
			protected.GET("vault/status", handler.GetVaultStatus)

			// Entry routes (Phase 3)
			protected.POST("entries", handler.AddEntry)
			protected.GET("entries", handler.GetEntries)
			protected.GET("entries/list", handler.ListEntries)
			protected.DELETE("entries", handler.DeleteEntry)
		}

		// Status endpoint (public)
		api.GET("/status", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{
				"message": "API ready - Phase 3 core vault operations implemented!",
				"endpoints": gin.H{
					"auth": gin.H{
						"POST /api/auth/url":      "Get Google OAuth URL",
						"POST /api/auth/callback": "Handle OAuth callback",
						"GET /api/auth/callback":  "Handle browser OAuth callback",
					},
					"protected": gin.H{
						"GET /api/user":            "Get current user (requires auth)",
						"POST /api/user/refresh":   "Refresh JWT token (requires auth)",
						"POST /api/vault/register": "Register new vault (requires auth)",
						"POST /api/vault/recover":  "Recover vault with PIN (requires auth)",
						"POST /api/vault/refresh":  "Refresh vault metadata (requires auth)",
						"GET /api/vault/status":    "Get vault status (requires auth)",
						"POST /api/entries":        "Add entry to vault (requires auth)",
						"GET /api/entries":         "Get all entries (requires auth)",
						"GET /api/entries/list":    "List entry names (requires auth)",
						"DELETE /api/entries":      "Delete entry from vault (requires auth)",
					},
				},
			})
		})

		// Debug endpoint to show Google Client ID (for debugging OAuth issues)
		api.GET("/debug/config", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{
				"google_client_id":         getEnv("GOOGLE_CLIENT_ID", "NOT_SET"),
				"google_client_secret_set": getEnv("GOOGLE_CLIENT_SECRET", "") != "",
				"environment":              getEnv("ENV", "development"),
			})
		})
	}

	return router
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
