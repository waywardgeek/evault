package auth

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
)

type UserInfo struct {
	ID       string `json:"id"`
	Email    string `json:"email"`
	Name     string `json:"name"`
	Picture  string `json:"picture"`
	Verified bool   `json:"verified_email"`
}

type Claims struct {
	UserID string `json:"user_id"`
	Email  string `json:"email"`
	jwt.RegisteredClaims
}

// IDTokenClaims represents the claims in a Google ID token
type IDTokenClaims struct {
	Subject       string `json:"sub"`
	Email         string `json:"email"`
	EmailVerified bool   `json:"email_verified"`
	Name          string `json:"name"`
	Picture       string `json:"picture"`
	GivenName     string `json:"given_name"`
	FamilyName    string `json:"family_name"`
	jwt.RegisteredClaims
}

type AuthService struct {
	googleConfig *oauth2.Config
	jwtSecret    []byte
}

func NewAuthService(clientID, clientSecret, redirectURL, jwtSecret string) *AuthService {
	return &AuthService{
		googleConfig: &oauth2.Config{
			ClientID:     clientID,
			ClientSecret: clientSecret,
			RedirectURL:  redirectURL,
			Scopes: []string{
				"https://www.googleapis.com/auth/userinfo.email",
				"https://www.googleapis.com/auth/userinfo.profile",
				"openid",
			},
			Endpoint: google.Endpoint,
		},
		jwtSecret: []byte(jwtSecret),
	}
}

func (a *AuthService) GetGoogleAuthURL(state string) string {
	return a.googleConfig.AuthCodeURL(state, oauth2.AccessTypeOffline)
}

func (a *AuthService) HandleGoogleCallback(ctx context.Context, code string) (*UserInfo, error) {
	// Exchange code for token
	token, err := a.googleConfig.Exchange(ctx, code)
	if err != nil {
		return nil, fmt.Errorf("failed to exchange code for token: %w", err)
	}

	// Create HTTP client with token
	client := a.googleConfig.Client(ctx, token)

	// Make request to Google's userinfo endpoint
	resp, err := client.Get("https://www.googleapis.com/oauth2/v2/userinfo")
	if err != nil {
		return nil, fmt.Errorf("failed to get user info: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("failed to get user info: status %d", resp.StatusCode)
	}

	// Read response body
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response body: %w", err)
	}

	// Parse JSON response
	var userInfo UserInfo
	if err := json.Unmarshal(body, &userInfo); err != nil {
		return nil, fmt.Errorf("failed to parse user info: %w", err)
	}

	return &userInfo, nil
}

// ValidateGoogleIDToken validates a Google ID token and returns the claims
func (a *AuthService) ValidateGoogleIDToken(ctx context.Context, idToken string) (*IDTokenClaims, error) {
	// Log for debugging
	log.Printf("DEBUG: Validating ID token of length: %d", len(idToken))
	log.Printf("DEBUG: Using client ID: %s", a.googleConfig.ClientID)

	// Use Google's tokeninfo endpoint for ID tokens (different from the deprecated access token endpoint)
	tokeninfoURL := fmt.Sprintf("https://oauth2.googleapis.com/tokeninfo?id_token=%s", idToken)
	log.Printf("DEBUG: Calling tokeninfo URL: %s", "https://oauth2.googleapis.com/tokeninfo?id_token=<redacted>")

	resp, err := http.Get(tokeninfoURL)
	if err != nil {
		log.Printf("ERROR: Failed to call tokeninfo endpoint: %v", err)
		return nil, fmt.Errorf("failed to validate ID token: %w", err)
	}
	defer resp.Body.Close()

	log.Printf("DEBUG: Tokeninfo response status: %d", resp.StatusCode)

	if resp.StatusCode != http.StatusOK {
		// Read the error response body for debugging
		body, _ := io.ReadAll(resp.Body)
		log.Printf("ERROR: Invalid ID token response: %s", string(body))
		return nil, fmt.Errorf("invalid ID token: status %d", resp.StatusCode)
	}

	// Read and parse response
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		log.Printf("ERROR: Failed to read tokeninfo response: %v", err)
		return nil, fmt.Errorf("failed to read token validation response: %w", err)
	}

	log.Printf("DEBUG: Tokeninfo response body: %s", string(body))

	var tokenInfo struct {
		Aud           string `json:"aud"`
		Sub           string `json:"sub"`
		Email         string `json:"email"`
		EmailVerified string `json:"email_verified"`
		Name          string `json:"name"`
		Picture       string `json:"picture"`
		GivenName     string `json:"given_name"`
		FamilyName    string `json:"family_name"`
		Iss           string `json:"iss"`
		Exp           string `json:"exp"`
		Iat           string `json:"iat"`
	}

	if err := json.Unmarshal(body, &tokenInfo); err != nil {
		log.Printf("ERROR: Failed to parse tokeninfo response: %v", err)
		return nil, fmt.Errorf("failed to parse token validation response: %w", err)
	}

	log.Printf("DEBUG: Parsed token info - aud: %s, sub: %s, email: %s, iss: %s",
		tokenInfo.Aud, tokenInfo.Sub, tokenInfo.Email, tokenInfo.Iss)

	// Verify the token is for our client
	if tokenInfo.Aud != a.googleConfig.ClientID {
		log.Printf("ERROR: Client ID mismatch - expected: %s, got: %s", a.googleConfig.ClientID, tokenInfo.Aud)
		return nil, fmt.Errorf("ID token audience mismatch: expected %s, got %s", a.googleConfig.ClientID, tokenInfo.Aud)
	}

	// Verify issuer
	if tokenInfo.Iss != "https://accounts.google.com" && tokenInfo.Iss != "accounts.google.com" {
		log.Printf("ERROR: Invalid issuer: %s", tokenInfo.Iss)
		return nil, fmt.Errorf("invalid issuer: %s", tokenInfo.Iss)
	}

	// Convert string boolean to bool
	emailVerified := tokenInfo.EmailVerified == "true"

	// Create claims object
	claims := &IDTokenClaims{
		Subject:       tokenInfo.Sub,
		Email:         tokenInfo.Email,
		EmailVerified: emailVerified,
		Name:          tokenInfo.Name,
		Picture:       tokenInfo.Picture,
		GivenName:     tokenInfo.GivenName,
		FamilyName:    tokenInfo.FamilyName,
	}

	log.Printf("DEBUG: Successfully validated ID token for user: %s", claims.Email)
	return claims, nil
}

// jwkToRSAPublicKey converts JWK parameters to RSA public key
func jwkToRSAPublicKey(nStr, eStr string) (interface{}, error) {
	// This is a simplified version. In production, you'd want to use a proper JWK library
	// For now, we'll use a simpler validation approach
	return nil, fmt.Errorf("JWK conversion not implemented - using alternative validation")
}

func (a *AuthService) GenerateJWT(userID, email string) (string, error) {
	claims := &Claims{
		UserID: userID,
		Email:  email,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			NotBefore: jwt.NewNumericDate(time.Now()),
			Issuer:    "evault-server",
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(a.jwtSecret)
}

func (a *AuthService) ValidateJWT(tokenString string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return a.jwtSecret, nil
	})

	if err != nil {
		return nil, fmt.Errorf("failed to parse token: %w", err)
	}

	if claims, ok := token.Claims.(*Claims); ok && token.Valid {
		return claims, nil
	}

	return nil, fmt.Errorf("invalid token")
}

func (a *AuthService) GenerateState() (string, error) {
	b := make([]byte, 32)
	_, err := rand.Read(b)
	if err != nil {
		return "", fmt.Errorf("failed to generate state: %w", err)
	}
	return base64.URLEncoding.EncodeToString(b), nil
}
