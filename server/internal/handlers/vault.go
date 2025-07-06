package handlers

import (
	"encoding/base64"
	"evault-server/internal/database"
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
	var req RegisterVaultRequest
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

	userModel := user.(*database.User)

	// Check if user already has a vault
	if userModel.OpenADPMetadata != nil {
		c.JSON(http.StatusConflict, gin.H{"error": "User already has a vault registered"})
		return
	}

	// SECURITY: Server just stores the metadata provided by client
	// Client has already done OpenADP registration and derived keys
	if err := h.db.UpdateUserOpenADPMetadata(userModel.UserID, req.OpenADPMetadata); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save vault metadata"})
		return
	}

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
	_, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	// TODO: Validate deletion pre-hash against stored deletion hash
	// This requires implementing SHA256 validation

	c.JSON(http.StatusOK, gin.H{"message": "Entry deletion not fully implemented yet"})
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
