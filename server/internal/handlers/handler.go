package handlers

import (
	"evault-server/internal/database"
)

type Handler struct {
	db *database.Service
}

func NewHandler(db *database.Service) *Handler {
	return &Handler{
		db: db,
	}
}

// Placeholder methods for future implementation
// Phase 2: Authentication methods
// func (h *Handler) HandleGoogleAuth(c *gin.Context) {}
// func (h *Handler) HandleGoogleCallback(c *gin.Context) {}

// Phase 3: Vault methods
// func (h *Handler) RegisterVault(c *gin.Context) {}
// func (h *Handler) RecoverVault(c *gin.Context) {}

// Phase 3: Entry methods
// func (h *Handler) AddEntry(c *gin.Context) {}
// func (h *Handler) GetEntries(c *gin.Context) {}
// func (h *Handler) ListEntries(c *gin.Context) {}
// func (h *Handler) DeleteEntry(c *gin.Context) {}
