package main

import (
	"database/sql"
	"fmt"
	"log"
	"net/http"
	"os"

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

	// Initialize handlers
	handler := handlers.NewHandler(dbService)

	// Setup Gin router
	router := setupRouter(handler)

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

func setupRouter(handler *handlers.Handler) *gin.Engine {
	// Set Gin mode
	if getEnv("ENV", "development") == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	router := gin.Default()

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

	// Health check endpoint
	router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status":  "healthy",
			"service": "evault-server",
		})
	})

	// API routes (will be implemented in later phases)
	api := router.Group("/api")
	{
		// Authentication routes (Phase 2)
		// api.POST("/auth/google", handler.HandleGoogleAuth)
		// api.POST("/auth/callback", handler.HandleGoogleCallback)

		// Vault routes (Phase 3)
		// api.POST("/vault/register", handler.RegisterVault)
		// api.POST("/vault/recover", handler.RecoverVault)

		// Entry routes (Phase 3)
		// api.POST("/entries", handler.AddEntry)
		// api.GET("/entries", handler.GetEntries)
		// api.GET("/entries/list", handler.ListEntries)
		// api.DELETE("/entries/:name", handler.DeleteEntry)

		// Placeholder for now
		api.GET("/status", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{
				"message": "API ready - endpoints will be implemented in Phase 2 & 3",
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
