// Shared API types for eVault
// These types will be used by both client and server

export interface User {
  user_id: string;
  email: string;
  phone_number?: string;
  auth_provider: string;
  verified: boolean;
  openadp_metadata?: string;    // Base64 encoded OpenADP metadata
  vault_public_key?: string;    // Base64 encoded HPKE public key
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

// API Request/Response types for eVault

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
  pin: string;
  metadata?: any;
}

export interface RegisterVaultResponse {
  success: boolean;
  vault_public_key: string;
}

export interface RecoverVaultRequest {
  pin: string;
  metadata: any;
}

export interface RecoverVaultResponse {
  success: boolean;
  vault_private_key: string;
}

// Entry types (Phase 3)
export interface AddEntryRequest {
  name: string;
  hpke_blob: Uint8Array;
  deletion_hash: Uint8Array;
}

export interface AddEntryResponse {
  success: boolean;
}

export interface GetEntriesRequest {
  names?: string[];
}

export interface GetEntriesResponse {
  entries: Entry[];
}

export interface ListEntriesResponse {
  entries: Array<{
    name: string;
    created_at: string;
    updated_at: string;
  }>;
}

export interface DeleteEntryRequest {
  name: string;
  deletion_hash: Uint8Array;
}

export interface DeleteEntryResponse {
  success: boolean;
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