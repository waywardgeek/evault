package handlers

import (
	"crypto/sha256"
	"encoding/base64"
	"evault-server/internal/database"
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
)

// Request/Response types for vault operations - NO OpenADP service types needed
type RegisterVaultRequest struct {
	Pin             string `json:"pin" binding:"required"`
	OpenADPMetadata string `json:"openadp_metadata" binding:"required"` // Base64 encoded, from client
}

type RegisterVaultResponse struct {
	Success bool `json:"success"`
	// SECURITY: No public key, no metadata return - client handles all OpenADP operations
}

type RecoverVaultRequest struct {
	Pin string `json:"pin" binding:"required"`
}

type RecoverVaultResponse struct {
	Success         bool   `json:"success"`
	OpenADPMetadata string `json:"openadp_metadata"` // Return stored metadata to client
	// SECURITY: Client handles OpenADP recovery, derives keys
}

// RegisterVault handles vault registration - ONLY stores metadata from client
func (h *Handler) RegisterVault(c *gin.Context) {
	log.Printf("🔐 Processing vault registration request")

	var req RegisterVaultRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		log.Printf("❌ Invalid request format: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request format"})
		return
	}

	log.Printf("📊 Registration request: PIN length=%d, metadata length=%d", len(req.Pin), len(req.OpenADPMetadata))

	// Validate PIN requirements
	if len(req.Pin) < 4 {
		log.Printf("❌ PIN too short: %d characters", len(req.Pin))
		c.JSON(http.StatusBadRequest, gin.H{"error": "PIN must be at least 4 characters long"})
		return
	}
	if len(req.Pin) > 128 {
		log.Printf("❌ PIN too long: %d characters", len(req.Pin))
		c.JSON(http.StatusBadRequest, gin.H{"error": "PIN must be less than 128 characters"})
		return
	}

	// Get user from context
	user, exists := c.Get("user")
	if !exists {
		log.Printf("❌ User not found in context")
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	userModel := user.(*database.User)
	log.Printf("👤 Processing registration for user: %s", userModel.Email)

	// Check if user already has a vault
	if userModel.OpenADPMetadata != nil {
		log.Printf("⚠️  User %s already has a vault registered", userModel.Email)
		c.JSON(http.StatusConflict, gin.H{"error": "User already has a vault registered"})
		return
	}

	// SECURITY: Server just stores the metadata provided by client
	// Client has already done OpenADP registration and derived keys
	log.Printf("💾 Storing OpenADP metadata for user: %s", userModel.Email)
	if err := h.db.UpdateUserOpenADPMetadata(userModel.UserID, req.OpenADPMetadata); err != nil {
		log.Printf("❌ Failed to save vault metadata for user %s: %v", userModel.Email, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save vault metadata"})
		return
	}

	log.Printf("✅ Successfully registered vault for user: %s", userModel.Email)
	c.JSON(http.StatusOK, RegisterVaultResponse{
		Success: true,
	})
}

// RecoverVault returns stored metadata for client to handle OpenADP recovery
func (h *Handler) RecoverVault(c *gin.Context) {
	var req RecoverVaultRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request format"})
		return
	}

	// Validate PIN requirements
	if len(req.Pin) < 4 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "PIN must be at least 4 characters long"})
		return
	}
	if len(req.Pin) > 128 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "PIN must be less than 128 characters"})
		return
	}

	// Get user from context
	user, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	userModel := user.(*database.User)

	// Check if user has a vault
	if userModel.OpenADPMetadata == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User has no vault registered"})
		return
	}

	// SECURITY: Just return stored metadata - client handles OpenADP recovery
	c.JSON(http.StatusOK, RecoverVaultResponse{
		Success:         true,
		OpenADPMetadata: *userModel.OpenADPMetadata,
	})
}

// VaultRequest represents requests for vault operations
type AddEntryRequest struct {
	Name         string `json:"name" binding:"required"`
	HPKEBlob     string `json:"hpke_blob" binding:"required"`     // base64 encoded
	DeletionHash string `json:"deletion_hash" binding:"required"` // base64 encoded
}

type DeleteEntryRequest struct {
	Name            string `json:"name" binding:"required"`
	DeletionPreHash string `json:"deletion_pre_hash" binding:"required"` // base64 encoded
}

// VaultResponse represents responses from vault operations
type ListEntriesResponse struct {
	Names []string `json:"names"`
}

type GetEntriesResponse struct {
	Entries []EntryBlob `json:"entries"`
}

type EntryBlob struct {
	Name     string `json:"name"`
	HPKEBlob string `json:"hpke_blob"` // base64 encoded
}

// AddEntry handles adding new encrypted entries to the vault
func (h *Handler) AddEntry(c *gin.Context) {
	var req AddEntryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request format"})
		return
	}

	// Get user from context
	user, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	userObj := user.(*database.User)

	// Validate that user has a vault registered
	if userObj.OpenADPMetadata == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Vault not registered. Please register vault first."})
		return
	}

	// Decode base64 data
	hpkeBlob, err := base64.StdEncoding.DecodeString(req.HPKEBlob)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid HPKE blob encoding"})
		return
	}

	deletionHash, err := base64.StdEncoding.DecodeString(req.DeletionHash)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid deletion hash encoding"})
		return
	}

	// Validate entry size (max 1KiB)
	if len(hpkeBlob) > 1024 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Entry size exceeds 1KiB limit"})
		return
	}

	// Check user entry count (max 1024 entries)
	entries, err := h.db.GetEntriesByUserID(userObj.UserID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to check entry count"})
		return
	}

	if len(entries) >= 1024 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Maximum entry count (1024) reached"})
		return
	}

	// Create entry
	entry := &database.Entry{
		UserID:       userObj.UserID,
		Name:         req.Name,
		HPKEBlob:     hpkeBlob,
		DeletionHash: deletionHash,
	}

	err = h.db.CreateEntry(entry)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create entry"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Entry added successfully"})
}

// DeleteEntry handles deleting entries from the vault
func (h *Handler) DeleteEntry(c *gin.Context) {
	var req DeleteEntryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request format"})
		return
	}

	// Get user from context
	user, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	userObj := user.(*database.User)

	// Get the entry to delete
	entry, err := h.db.GetEntryByNameAndUserID(req.Name, userObj.UserID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Entry not found"})
		return
	}

	// Decode the deletion pre-hash from the request
	deletionPreHash, err := base64.StdEncoding.DecodeString(req.DeletionPreHash)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid deletion pre-hash encoding"})
		return
	}

	// SECURITY: Validate deletion pre-hash against stored deletion hash
	// The client must provide the pre-hash that when SHA256'd equals the stored deletion hash
	computedHash := sha256.Sum256(deletionPreHash)

	// Compare computed hash with stored deletion hash
	if len(entry.DeletionHash) != len(computedHash) {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid deletion authorization"})
		return
	}

	// Constant-time comparison to prevent timing attacks
	hashMatch := true
	for i := 0; i < len(entry.DeletionHash); i++ {
		if entry.DeletionHash[i] != computedHash[i] {
			hashMatch = false
		}
	}

	if !hashMatch {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid deletion authorization"})
		return
	}

	// Delete the entry
	if err := h.db.DeleteEntry(userObj.UserID, req.Name); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete entry"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Entry deleted successfully"})
}

// ListEntries returns list of entry names for display
func (h *Handler) ListEntries(c *gin.Context) {
	// Get user from context
	user, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	userObj := user.(*database.User)

	entries, err := h.db.GetEntriesByUserID(userObj.UserID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve entries"})
		return
	}

	var names []string
	for _, entry := range entries {
		names = append(names, entry.Name)
	}

	c.JSON(http.StatusOK, ListEntriesResponse{Names: names})
}

// GetEntries returns encrypted entry data for decryption client-side
func (h *Handler) GetEntries(c *gin.Context) {
	// Get user from context
	user, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	userObj := user.(*database.User)

	entries, err := h.db.GetEntriesByUserID(userObj.UserID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve entries"})
		return
	}

	var entryBlobs []EntryBlob
	for _, entry := range entries {
		entryBlobs = append(entryBlobs, EntryBlob{
			Name:     entry.Name,
			HPKEBlob: base64.StdEncoding.EncodeToString(entry.HPKEBlob),
		})
	}

	c.JSON(http.StatusOK, GetEntriesResponse{Entries: entryBlobs})
}

// GetVaultStatus returns vault registration status
func (h *Handler) GetVaultStatus(c *gin.Context) {
	// Get user from context
	user, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	userObj := user.(*database.User)

	hasVault := userObj.OpenADPMetadata != nil

	c.JSON(http.StatusOK, gin.H{
		"has_vault":        hasVault,
		"openadp_metadata": userObj.OpenADPMetadata, // Return metadata for client OpenADP operations
	})
}
