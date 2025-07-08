// Shared API types for eVaultApp
// These types will be used by both client and server

export interface User {
  user_id: string;
  email: string;
  phone_number?: string;
  auth_provider: string;
  verified: boolean;
  openadp_metadata?: string;    // Base64 encoded OpenADP metadata
  // SECURITY: Removed vault_public_key - client will derive from long-term secret
  created_at: string;
  updated_at: string;
}

export interface Entry {
  user_id: string;
  name: string;
  hpke_blob: Uint8Array;
  deletion_hash: Uint8Array;
  created_at: string;
  updated_at: string;
}

// API Request/Response types for eVaultApp

// Authentication types (Phase 2)
export interface AuthRequest {
  redirect_url?: string;
}

export interface AuthResponse {
  auth_url: string;
  state: string;
}

export interface CallbackRequest {
  code: string;
  state: string;
}

export interface CallbackResponse {
  token: string;
  user: User;
}

export interface UserResponse {
  user: User;
}

export interface RefreshTokenResponse {
  token: string;
}

// Vault types (Phase 3)
export interface RegisterVaultRequest {
  pin: string;                // PIN for validation
  openadp_metadata: string;   // Base64 encoded OpenADP metadata from client
}

export interface RegisterVaultResponse {
  success: boolean;
  // SECURITY: Server just confirms registration - no metadata or keys returned
}

export interface RecoverVaultRequest {
  pin: string;                // PIN for validation
}

export interface RecoverVaultResponse {
  success: boolean;
  openadp_metadata: string;   // Return stored metadata for client OpenADP operations
  // SECURITY: Client handles OpenADP recovery and key derivation
}

// Entry types (Phase 3)
export interface AddEntryRequest {
  name: string;
  hpke_blob: string;          // Base64 encoded encrypted data
  deletion_hash: string;      // Base64 encoded deletion hash
}

export interface AddEntryResponse {
  message: string;
}

export interface GetEntriesRequest {
  names?: string[];
}

export interface GetEntriesResponse {
  entries: EntryBlob[];
}

export interface ListEntriesResponse {
  names: string[];
}

export interface DeleteEntryRequest {
  name: string;
  deletion_pre_hash: string;  // Base64 encoded deletion pre-hash
}

export interface DeleteEntryResponse {
  message: string;
}

export interface EntryBlob {
  name: string;
  hpke_blob: string;          // Base64 encoded encrypted data
}

// Vault Status
export interface VaultStatusResponse {
  has_vault: boolean;
  openadp_metadata?: string;  // Metadata for client to use
  // SECURITY: Removed vault_public_key - client derives from long-term secret
}

// Error response
export interface ErrorResponse {
  error: string;
}

// Health check response
export interface HealthResponse {
  status: 'healthy' | 'unhealthy';
  service: string;
} 