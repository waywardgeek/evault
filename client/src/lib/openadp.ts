// OpenADP integration for eVaultApp - REAL IMPLEMENTATION
// Using local browser-compatible OpenADP SDK to connect to live distributed servers

import { register, recover, recoverAndReregister } from '@/lib/openadp-browser/index.js';

export class eVaultOpenADP {
  /**
   * Register a new vault with OpenADP distributed servers
   * SECURITY: Only returns metadata, client derives HPKE keypair from long-term secret
   */
  async registerNewVault(userID: string, pin: string): Promise<{ metadata: string; privateKey: Uint8Array }> {
    try {
      console.log(`🔐 Registering vault with real OpenADP servers for user: ${userID}`);
      console.log(`📱 PIN length: ${pin.length} characters`);
      
      // Generate a random 32-byte long-term secret
      const longTermSecret = crypto.getRandomValues(new Uint8Array(32));
      console.log(`🔑 Generated long-term secret: ${longTermSecret.length} bytes`);
      
      // Use real OpenADP to protect the long-term secret
      const appID = 'evault-app'; // Application identifier
      const maxGuesses = 10; // PIN attempt limit
      
      console.log(`🌐 Connecting to live OpenADP distributed network...`);
      console.log(`📊 Parameters: userID=${userID}, appID=${appID}, maxGuesses=${maxGuesses}`);
      
      // Call real OpenADP register function
      console.log(`🔄 Calling OpenADP register() function...`);
      const metadata = await register(userID, appID, longTermSecret, pin, maxGuesses);
      
      console.log(`✅ Successfully registered with OpenADP distributed servers`);
      console.log(`📊 Metadata received: ${metadata ? 'Yes' : 'No'}`);
      console.log(`📊 Metadata type: ${typeof metadata}`);
      console.log(`📊 Metadata size: ${metadata?.length || 0} bytes`);
      
      if (!metadata) {
        throw new Error('OpenADP registration returned null/undefined metadata');
      }
      
      // Derive HPKE keypair from long-term secret
      console.log(`🔑 Deriving HPKE keypair from long-term secret...`);
      const { publicKey, privateKey } = await this.deriveHPKEKeypair(longTermSecret);
      
      // Store public key permanently in localStorage (enables adding entries)
      console.log(`💾 Storing public key permanently in localStorage...`);
      this.storePublicKeyLocally(publicKey);
      
      // Cache private key in memory for vault operations (decrypt/delete)
      console.log(`🔐 Caching private key in memory for vault operations...`);
      this.cachePrivateKey(privateKey);
      
      console.log(`🔑 Derived and stored HPKE keys (public permanent, private temporary)`);
      
      // Convert metadata to base64
      const metadataBase64 = btoa(String.fromCharCode.apply(null, Array.from(metadata)));
      console.log(`📦 Converted metadata to base64: ${metadataBase64.length} characters`);
      
      return {
        metadata: metadataBase64,
        privateKey: privateKey // Return private key for immediate use
      };
    } catch (error) {
      const err = error as Error;
      console.error('❌ Real OpenADP registration failed:', err);
      console.error('❌ Error message:', err.message);
      console.error('❌ Error stack:', err.stack);
      throw new Error(`Vault registration failed: ${err.message}`);
    }
  }

  /**
   * Recover vault key using PIN from OpenADP distributed servers
   * SECURITY: Derives HPKE keypair from recovered long-term secret
   */
  async recoverVaultKey(metadata: string, pin: string): Promise<{ privateKey: Uint8Array, remaining: number }> {
    try {
      console.log(`🔓 Attempting vault recovery from OpenADP distributed servers`);
      
      // Convert base64 metadata back to Uint8Array
      const metadataBytes = new Uint8Array(atob(metadata).split('').map(c => c.charCodeAt(0)));
      
      console.log(`🌐 Contacting OpenADP distributed network...`);
      
      // Call real OpenADP recover function
      const result = await recover(metadataBytes, pin);
      
      console.log(`✅ Successfully recovered from OpenADP servers`);
      console.log(`⚠️ Remaining attempts: ${result.remaining}`);
      
      // Handle automatic backup refresh if provided
      if (result.updatedMetadata) {
        console.log(`📝 OpenADP provided refreshed backup metadata`);
        console.log(`🔄 Sending refreshed metadata to server for storage...`);
        
        // Send updated metadata to server using two-slot refresh cycle
        await this.sendMetadataRefresh(result.updatedMetadata);
      }
      
      // Derive HPKE keypair from recovered long-term secret
      const { publicKey, privateKey } = await this.deriveHPKEKeypair(result.secret);
      
      // Store public key permanently in localStorage (enables adding entries)
      this.storePublicKeyLocally(publicKey);
      
      // Cache private key in memory for vault operations (decrypt/delete)
      this.cachePrivateKey(privateKey);
      
      console.log(`🔑 Derived and stored HPKE keys from recovered long-term secret (public permanent, private temporary)`);
      
      return { 
        privateKey: privateKey, // Return the HPKE private key
        remaining: result.remaining
      };
    } catch (error) {
      const err = error as Error;
      console.error('❌ Real OpenADP recovery failed:', err.message);
      throw new Error(`Key recovery failed: ${err.message}`);
    }
  }

  /**
   * Reset vault when locked out - uses recoverAndReregister to create fresh metadata
   * This breaks out of the "too many guesses" lockout by creating a completely new backup
   */
  async resetLockedVault(metadata: string, pin: string): Promise<{ privateKey: Uint8Array, newMetadata: string }> {
    try {
      console.log(`🔄 Attempting vault reset to break out of lockout...`);
      
      // Convert base64 metadata back to Uint8Array
      const metadataBytes = new Uint8Array(atob(metadata).split('').map(c => c.charCodeAt(0)));
      
      console.log(`🌐 Calling OpenADP recoverAndReregister...`);
      
      // Use recoverAndReregister to create completely fresh metadata
      const result = await recoverAndReregister(metadataBytes, pin);
      
      console.log(`✅ Vault reset successful - created fresh metadata`);
      
      // Derive HPKE keypair from recovered long-term secret
      const { publicKey, privateKey } = await this.deriveHPKEKeypair(result.secret);
      
      // Store public key permanently in localStorage
      this.storePublicKeyLocally(publicKey);
      
      // Cache private key in memory for vault operations
      this.cachePrivateKey(privateKey);
      
      // Convert new metadata to base64
      const newMetadataBase64 = btoa(String.fromCharCode.apply(null, Array.from(result.newMetadata)));
      
      console.log(`🔑 Derived and stored HPKE keys from reset vault`);
      
      return { 
        privateKey: privateKey,
        newMetadata: newMetadataBase64
      };
    } catch (error) {
      const err = error as Error;
      console.error('❌ Vault reset failed:', err.message);
      throw new Error(`Vault reset failed: ${err.message}`);
    }
  }

  /**
   * Derive HPKE keypair from long-term secret using X25519
   * SECURITY: Client-side only - never send to server
   */
  private async deriveHPKEKeypair(longTermSecret: Uint8Array): Promise<{ publicKey: Uint8Array, privateKey: Uint8Array }> {
    // Import the new HPKE implementation
    const { deriveHPKEKeypair } = await import('./hpke.js');
    return deriveHPKEKeypair(longTermSecret);
  }

  /**
   * Store public key locally on this device
   * SECURITY: Never send to server - only local storage
   */
  private async storePublicKeyLocally(publicKey: Uint8Array) {
    const { storePublicKeyLocally } = await import('./hpke.js');
    storePublicKeyLocally(publicKey);
  }

  /**
   * Cache private key in memory for vault operations
   * SECURITY: Temporary storage, cleared on vault lock
   */
  private async cachePrivateKey(privateKey: Uint8Array) {
    const { cachePrivateKey } = await import('./hpke.js');
    cachePrivateKey(privateKey);
  }

  /**
   * Get auth token from session (placeholder)
   */
  private getAuthToken(): string {
    // In a real app, this would come from NextAuth session
    return '';
  }

  /**
   * Send refreshed metadata to server for two-slot storage
   * CRITICAL: This implements the OpenADP metadata refresh cycle
   */
  private async sendMetadataRefresh(updatedMetadata: Uint8Array): Promise<void> {
    try {
      console.log(`📡 Sending metadata refresh to server...`);
      console.log(`📊 Updated metadata length: ${updatedMetadata.length} bytes`);
      
      // Convert metadata to base64 for JSON transport
      const metadataBase64 = btoa(String.fromCharCode.apply(null, Array.from(updatedMetadata)));
      console.log(`📦 Metadata base64 length: ${metadataBase64.length} characters`);
      console.log(`📦 Metadata preview: ${metadataBase64.substring(0, 100)}...`);
      
      console.log(`📤 Sending refresh request to /api/vault/refresh...`);
      
      // Use apiClient which handles NextAuth authentication properly
      const { apiClient } = await import('../lib/api-client');
      
      const result = await apiClient.post<{ success: boolean; error?: string }>('/api/vault/refresh', {
        updated_metadata: metadataBase64,
      });
      
      console.log(`📥 Server response:`, result);
      
      if (result.success) {
        console.log(`✅ Metadata refresh successful - server updated two-slot storage`);
      } else {
        console.log(`❌ Metadata refresh failed: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('❌ Failed to send metadata refresh:', error);
      // Don't throw - this is not a critical failure for the user
      // The vault will still work, but the metadata won't be refreshed
    }
  }

  private vaultState: {
    publicKey: Uint8Array | null;
    privateKey: Uint8Array | null;
    vaultId: string | null;
  } = {
    publicKey: null,
    privateKey: null,
    vaultId: null,
  };

  async clearAllKeys(): Promise<void> {
    console.log('🗑️ Clearing all keys and vault data...');
    
    // Clear all stored keys
    if (typeof window !== 'undefined') {
      localStorage.removeItem('evault_public_key');
      localStorage.removeItem('evault_private_key');
      localStorage.removeItem('evault_vault_id');
      localStorage.removeItem('evault_vault_status');
      localStorage.removeItem('evault_openadp_metadata');
      sessionStorage.removeItem('evault_private_key');
      
      // Clear any other potential keys
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key && key.startsWith('evault_')) {
          localStorage.removeItem(key);
        }
      }
      
      for (let i = sessionStorage.length - 1; i >= 0; i--) {
        const key = sessionStorage.key(i);
        if (key && key.startsWith('evault_')) {
          sessionStorage.removeItem(key);
        }
      }
    }
    
    // Clear in-memory state
    this.vaultState.publicKey = null;
    this.vaultState.privateKey = null;
    this.vaultState.vaultId = null;
    
    console.log('✅ All keys and vault data cleared');
  }

  async lockVault(): Promise<void> {
    const { clearCachedPrivateKey } = await import('./hpke.js');
    clearCachedPrivateKey();
    console.log('🔒 Vault locked - cleared private key from memory');
  }
}

/**
 * Crypto operations using HPKE - REAL IMPLEMENTATION
 */
export class eVaultCrypto {
  /**
   * Encrypt entry data using HPKE (X25519 + AES-256-GCM) with locally stored public key
   */
  async encryptEntry(name: string, secret: string): Promise<{ hpkeBlob: string, deletionHash: string }> {
    try {
      // Import HPKE functions
      const { getStoredPublicKey, encryptEntry: hpkeEncryptEntry } = await import('./hpke.js');
      
      // Get cached public key from local storage
      const publicKey = getStoredPublicKey();
      if (!publicKey) {
        throw new Error('No public key available. Please unlock vault first by entering your PIN.');
      }
      
              console.log(`🔐 Encrypting entry with HPKE v1: ${name}`);
        console.log(`🔑 Using locally stored X25519 public key (${publicKey.length} bytes)`);
        
        // Use the new HPKE implementation
        return await hpkeEncryptEntry(publicKey, name, secret);
    } catch (error) {
      const err = error as Error;
      console.error('❌ HPKE encryption failed:', err.message);
      throw new Error(`HPKE encryption failed: ${err.message}`);
    }
  }

  /**
   * Decrypt entry data using HPKE or legacy AES-GCM (backwards compatible)
   */
  async decryptEntry(hpkeBlob: string, privateKey: Uint8Array): Promise<{ name: string, secret: string, deletionPreHash: Uint8Array }> {
    try {
      // Import HPKE functions
      const { isHPKEv1Blob, decryptEntry: hpkeDecryptEntry } = await import('./hpke.js');
      
      console.log(`🔓 Decrypting entry`);
      console.log(`🔑 Using private key (${privateKey.length} bytes)`);
      
      // Check if this is a new HPKE v1 blob or legacy format
      if (isHPKEv1Blob(hpkeBlob)) {
        console.log(`📦 Detected HPKE v1 blob - using X25519 + AES-256-GCM`);
        return await hpkeDecryptEntry(hpkeBlob, privateKey);
      } else {
        console.log(`📦 Detected legacy blob - using backwards compatible AES-GCM`);
        return await this.decryptLegacyEntry(hpkeBlob, privateKey);
      }
    } catch (error) {
      const err = error as Error;
      console.error('❌ Decryption failed:', err.message);
      console.error('❌ Error details:', err.stack);
      throw new Error(`Decryption failed: ${err.message}`);
    }
  }

  /**
   * Decrypt legacy AES-GCM entries (backwards compatibility)
   */
  private async decryptLegacyEntry(hpkeBlob: string, privateKey: Uint8Array): Promise<{ name: string, secret: string, deletionPreHash: Uint8Array }> {
    try {
      const blobBytes = new Uint8Array(atob(hpkeBlob).split('').map(c => c.charCodeAt(0)));
      
      console.log(`🔓 Decrypting legacy entry`);
      console.log(`📦 Blob size: ${blobBytes.length} bytes`);
      console.log(`🔧 Private key preview: ${Array.from(privateKey.slice(0, 8)).map(b => b.toString(16).padStart(2, '0')).join('')}...`);
      
      // Parse encrypted blob format
      const { metadata, ciphertext, iv } = this.parseEncryptedBlob(blobBytes);
      
      // Import the key for AES-GCM
      const cryptoKey = await crypto.subtle.importKey(
        'raw',
        privateKey,
        { name: 'AES-GCM' },
        false,
        ['decrypt']
      );
      
      // Decrypt with metadata as additional data
      const additionalData = new TextEncoder().encode(JSON.stringify(metadata));
      const decryptedBuffer = await crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: iv,
          additionalData: additionalData
        },
        cryptoKey,
        ciphertext
      );
      
      console.log(`✅ Legacy AES-GCM decryption successful`);
      
      // Parse decrypted data
      const plaintext = new TextDecoder().decode(decryptedBuffer);
      const plaintextData = JSON.parse(plaintext);
      
      return {
        name: metadata.name,
        secret: plaintextData.secret,
        deletionPreHash: new Uint8Array(plaintextData.deletion_pre_hash)
      };
    } catch (error) {
      const err = error as Error;
      console.error('❌ Legacy decryption failed:', err.message);
      throw new Error(`Legacy decryption failed: ${err.message}`);
    }
  }

  /**
   * Create encrypted blob format
   */
  private createEncryptedBlob(metadata: any, ciphertext: Uint8Array, iv: Uint8Array): Uint8Array {
    const metadataBytes = new TextEncoder().encode(JSON.stringify(metadata));
    const metadataLength = new Uint32Array([metadataBytes.length]);
    const ivLength = new Uint32Array([iv.length]);
    
    // Format: [metadata_length(4)][metadata][iv_length(4)][iv][ciphertext]
    const totalLength = 4 + metadataBytes.length + 4 + iv.length + ciphertext.length;
    const blob = new Uint8Array(totalLength);
    
    let offset = 0;
    blob.set(new Uint8Array(metadataLength.buffer), offset);
    offset += 4;
    blob.set(metadataBytes, offset);
    offset += metadataBytes.length;
    blob.set(new Uint8Array(ivLength.buffer), offset);
    offset += 4;
    blob.set(iv, offset);
    offset += iv.length;
    blob.set(ciphertext, offset);
    
    return blob;
  }

  /**
   * Parse encrypted blob format
   */
  private parseEncryptedBlob(blobBytes: Uint8Array): { metadata: any, ciphertext: Uint8Array, iv: Uint8Array } {
    let offset = 0;
    
    // Read metadata length
    const metadataLengthBytes = blobBytes.slice(offset, offset + 4);
    const metadataLength = new Uint32Array(metadataLengthBytes.buffer)[0];
    offset += 4;
    
    // Read metadata
    const metadataBytes = blobBytes.slice(offset, offset + metadataLength);
    const metadata = JSON.parse(new TextDecoder().decode(metadataBytes));
    offset += metadataLength;
    
    // Read IV length
    const ivLengthBytes = blobBytes.slice(offset, offset + 4);
    const ivLength = new Uint32Array(ivLengthBytes.buffer)[0];
    offset += 4;
    
    // Read IV
    const iv = blobBytes.slice(offset, offset + ivLength);
    offset += ivLength;
    
    // Read ciphertext
    const ciphertext = blobBytes.slice(offset);
    
    return { metadata, ciphertext, iv };
  }
}

/**
 * Check if vault is unlocked (private key available for decryption)
 */
export async function isVaultUnlocked(): Promise<boolean> {
  const { isVaultUnlocked } = await import('./hpke.js');
  return isVaultUnlocked();
}

/**
 * Complete logout - clear ALL keys from storage and memory
 * SECURITY: Full cleanup on user logout
 */
export async function clearAllKeys() {
  // Use the class method for thorough cleanup
  await openadp.clearAllKeys();
  
  // Also clear HPKE keys
  const { clearStoredPublicKey, clearCachedPrivateKey } = await import('./hpke.js');
  clearStoredPublicKey(); // Clear public key from localStorage
  clearCachedPrivateKey(); // Clear private key from memory
  console.log('🗑️ Complete logout - cleared all HPKE keys');
}

/**
 * Check if public key is available locally (enables adding entries)
 */
export async function hasLocalPublicKey(): Promise<boolean> {
  const { getStoredPublicKey } = await import('./hpke.js');
  return getStoredPublicKey() !== null;
}

/**
 * Get cached private key for vault operations
 */
export async function getCachedPrivateKey(): Promise<Uint8Array | null> {
  const { getCachedPrivateKey } = await import('./hpke.js');
  return getCachedPrivateKey();
}

// Legacy functions - kept for compatibility but deprecated
export function cachePublicKey(publicKey: string) {
  console.warn('⚠️ cachePublicKey is deprecated - use HPKE key derivation instead');
  localStorage.setItem('evault-hpke-public-key', publicKey);
}

export function getCachedPublicKey(): string | null {
  return localStorage.getItem('evault-hpke-public-key');
}

export function clearCachedKey() {
  console.warn('⚠️ clearCachedKey is deprecated - use lockVault() or clearAllKeys() instead');
  lockVault();
}

// Global instances
export const openadp = new eVaultOpenADP();
export const crypto_service = new eVaultCrypto();

/**
 * Lock vault - clear private key from memory (public key stays for adding entries)
 * SECURITY: Only removes decryption capability, preserves ability to add entries
 */
export async function lockVault() {
  const { clearCachedPrivateKey } = await import('./hpke.js');
  clearCachedPrivateKey();
  console.log('🔒 Vault locked - cleared private key from memory');
}

