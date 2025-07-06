package handlers

import (
	"fmt"
	"net/http"
	"strings"

	"evault-server/internal/database"

	"github.com/gin-gonic/gin"
)

type AuthRequest struct {
	RedirectURL string `json:"redirect_url,omitempty"`
}

type AuthResponse struct {
	AuthURL string `json:"auth_url"`
	State   string `json:"state"`
}

type CallbackRequest struct {
	Code        string `json:"code,omitempty"`         // For direct OAuth code flow
	State       string `json:"state,omitempty"`        // For direct OAuth code flow
	AccessToken string `json:"access_token,omitempty"` // For NextAuth token exchange
	IDToken     string `json:"id_token,omitempty"`     // For NextAuth token exchange
	User        struct {
		ID    string `json:"id"`
		Email string `json:"email"`
		Name  string `json:"name"`
		Image string `json:"image"`
	} `json:"user,omitempty"` // For NextAuth user info
}

type CallbackResponse struct {
	Token string         `json:"token"`
	User  *database.User `json:"user"`
}

type UserResponse struct {
	User *database.User `json:"user"`
}

// GetAuthURL generates Google OAuth URL
func (h *Handler) GetAuthURL(c *gin.Context) {
	var req AuthRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	// Generate state for CSRF protection
	state, err := h.authService.GenerateState()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate state"})
		return
	}

	// Store state in session/cache (for now, we'll include it in response)
	// In production, you'd store this in Redis or similar
	authURL := h.authService.GetGoogleAuthURL(state)

	c.JSON(http.StatusOK, AuthResponse{
		AuthURL: authURL,
		State:   state,
	})
}

// HandleCallback handles Google OAuth callback
func (h *Handler) HandleCallback(c *gin.Context) {
	var req CallbackRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		// Also support query parameters for direct browser redirects
		code := c.Query("code")
		state := c.Query("state")
		if code == "" || state == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Missing code or state"})
			return
		}
		req.Code = code
		req.State = state
	}

	var userInfo *database.User

	// Handle NextAuth token exchange flow
	if req.AccessToken != "" && req.User.Email != "" {
		// Validate the access token with Google (for security)
		if err := h.authService.ValidateGoogleAccessToken(c.Request.Context(), req.AccessToken); err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": fmt.Sprintf("Invalid access token: %v", err)})
			return
		}

		// Create user from NextAuth provided data
		userInfo = &database.User{
			UserID:       req.User.ID,
			Email:        req.User.Email,
			AuthProvider: "google",
			Verified:     true, // Google OAuth provides verified emails
		}
	} else if req.Code != "" {
		// Handle direct OAuth code flow
		if req.State == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid state"})
			return
		}

		// Exchange code for user info
		googleUserInfo, err := h.authService.HandleGoogleCallback(c.Request.Context(), req.Code)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("OAuth callback failed: %v", err)})
			return
		}

		userInfo = &database.User{
			UserID:       googleUserInfo.ID,
			Email:        googleUserInfo.Email,
			AuthProvider: "google",
			Verified:     googleUserInfo.Verified,
		}
	} else {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Missing required authentication data"})
		return
	}

	// Create or update user in database
	if err := h.db.CreateUser(userInfo); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create user"})
		return
	}

	// Generate JWT token
	token, err := h.authService.GenerateJWT(userInfo.UserID, userInfo.Email)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	c.JSON(http.StatusOK, CallbackResponse{
		Token: token,
		User:  userInfo,
	})
}

// GetCurrentUser returns current user info
func (h *Handler) GetCurrentUser(c *gin.Context) {
	user, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not found in context"})
		return
	}

	c.JSON(http.StatusOK, UserResponse{
		User: user.(*database.User),
	})
}

// RefreshToken generates a new JWT token
func (h *Handler) RefreshToken(c *gin.Context) {
	user, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not found in context"})
		return
	}

	dbUser := user.(*database.User)
	token, err := h.authService.GenerateJWT(dbUser.UserID, dbUser.Email)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"token": token})
}

// AuthMiddleware validates JWT tokens
func (h *Handler) AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		token := extractAuthToken(c)
		if token == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Missing or invalid authorization header"})
			c.Abort()
			return
		}

		claims, err := h.authService.ValidateJWT(token)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": fmt.Sprintf("Invalid token: %v", err)})
			c.Abort()
			return
		}

		// Get user from database
		user, err := h.db.GetUserByID(claims.UserID)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "User not found"})
			c.Abort()
			return
		}

		// Add user to context
		c.Set("user", user)
		c.Set("user_id", user.UserID)
		c.Set("claims", claims)

		c.Next()
	}
}

// extractAuthToken extracts Bearer token from Authorization header
func extractAuthToken(c *gin.Context) string {
	authHeader := c.GetHeader("Authorization")
	if authHeader == "" {
		return ""
	}

	parts := strings.SplitN(authHeader, " ", 2)
	if len(parts) != 2 || parts[0] != "Bearer" {
		return ""
	}

	return parts[1]
}

// getUserFromContext extracts user from gin context
func getUserFromContext(c *gin.Context) (*database.User, bool) {
	user, exists := c.Get("user")
	if !exists {
		return nil, false
	}
	return user.(*database.User), true
}
