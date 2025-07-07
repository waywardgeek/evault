// OpenADP integration for eVault - REAL IMPLEMENTATION
// Using local browser-compatible OpenADP SDK to connect to live distributed servers

import { register, recover } from '@/lib/openadp-browser/ocrypt.js';

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
      
      // Store public key locally for this device
      console.log(`💾 Storing public key locally for this device...`);
      this.storePublicKeyLocally(publicKey);
      
      console.log(`🔑 Derived and stored HPKE public key locally`);
      console.log(`🔑 Returning private key for immediate decryption capability`);
      
      // Convert metadata to base64
      const metadataBase64 = btoa(String.fromCharCode.apply(null, Array.from(metadata)));
      console.log(`📦 Converted metadata to base64: ${metadataBase64.length} characters`);
      
      return {
        metadata: metadataBase64,
        privateKey: privateKey // Return private key for immediate decryption
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
        // In a real implementation, you'd want to update the stored metadata
        // For now, we'll just log this
      }
      
      // Derive HPKE keypair from recovered long-term secret
      const { publicKey, privateKey } = await this.deriveHPKEKeypair(result.secret);
      
      // Store public key locally for this device
      this.storePublicKeyLocally(publicKey);
      
      console.log(`🔑 Derived and stored HPKE keys from recovered long-term secret`);
      
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
   * Get auth token from session (placeholder)
   */
  private getAuthToken(): string {
    // In a real app, this would come from NextAuth session
    return '';
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
 * Clear locally cached keys when user logs out
 * SECURITY: Remove keys from local storage
 */
export function clearCachedKeys() {
  localStorage.removeItem('evault-hpke-public-key');
  console.log('🗑️ Cleared cached HPKE keys');
}

/**
 * Check if public key is available locally
 */
export function hasLocalPublicKey(): boolean {
  return localStorage.getItem('evault-hpke-public-key') !== null;
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
  clearCachedKeys();
}

// Global instances
export const openadp = new eVaultOpenADP();
export const crypto_service = new eVaultCrypto(); 