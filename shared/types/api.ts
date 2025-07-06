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
  hpke_blob: string;     // Base64 encoded HPKE ciphertext
  deletion_hash: string; // Base64 encoded hash for deletion
  created_at: string;
  updated_at: string;
}

// API Request/Response types

export interface RegisterVaultRequest {
  vault_public_key: string;   // Base64 encoded HPKE public key
  openadp_metadata: string;   // Base64 encoded OpenADP metadata
}

export interface RecoverVaultRequest {
  pin: string;
}

export interface RecoverVaultResponse {
  openadp_metadata: string;   // Updated metadata
  remaining_guesses: number;
}

export interface AddEntryRequest {
  name: string;
  hpke_blob: string;          // Base64 encoded HPKE ciphertext
  deletion_hash: string;      // Base64 encoded hash for deletion
}

export interface GetEntriesResponse {
  entries: Entry[];
}

export interface ListEntriesResponse {
  names: string[];
}

export interface DeleteEntryRequest {
  name: string;
  deletion_pre_hash: string;  // Base64 encoded pre-hash for verification
}

// Authentication types
export interface GoogleAuthRequest {
  id_token: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

// Health check response
export interface HealthResponse {
  status: 'healthy' | 'unhealthy';
  service: string;
}

// Error response
export interface ErrorResponse {
  error: string;
  code?: string;
} 