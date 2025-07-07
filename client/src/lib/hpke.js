/**
 * HPKE (Hybrid Public Key Encryption) implementation for eVault
 * Uses X25519 + AES-256-GCM for strong, standards-compliant encryption
 * 
 * This replaces the simplified AES-GCM approach with proper HPKE:
 * - X25519 for key encapsulation (DHKEM)
 * - HKDF-SHA256 for key derivation  
 * - AES-256-GCM for authenticated encryption
 */

import {
  Aes256Gcm,
  CipherSuite,
  HkdfSha256,
} from "@hpke/core";
import { DhkemX25519HkdfSha256 } from "@hpke/dhkem-x25519";

/**
 * HPKE cipher suite: X25519 + HKDF-SHA256 + AES-256-GCM
 * This matches what you use in Ocrypt for consistency
 */
const hpkeSuite = new CipherSuite({
  kem: new DhkemX25519HkdfSha256(),
  kdf: new HkdfSha256(),
  aead: new Aes256Gcm(),
});

/**
 * Derive HPKE keypair from OpenADP long-term secret
 * 
 * @param {Uint8Array} longTermSecret - 32-byte secret from OpenADP recovery
 * @returns {Promise<{publicKey: Uint8Array, privateKey: Uint8Array}>}
 */
export async function deriveHPKEKeypair(longTermSecret) {
  try {
    // Use HKDF to derive X25519 private key from long-term secret
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      longTermSecret,
      { name: 'HKDF' },
      false,
      ['deriveKey']
    );
    
    // Derive 32-byte X25519 private key
    const derivedKeyMaterial = await crypto.subtle.deriveKey(
      {
        name: 'HKDF',
        hash: 'SHA-256',
        salt: new TextEncoder().encode('evault-hpke-x25519-salt'),
        info: new TextEncoder().encode('evault-hpke-x25519-private-key-v2')
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 }, // Just for export, not actual use
      true,
      ['encrypt']
    );
    
    // Export as raw bytes for X25519
    const privateKeyBytes = await crypto.subtle.exportKey('raw', derivedKeyMaterial);
    const privateKey = new Uint8Array(privateKeyBytes);
    
    // Generate the corresponding X25519 public key
    const keyPair = await hpkeSuite.kem.deriveKeyPair(privateKey);
    const publicKey = await hpkeSuite.kem.serializePublicKey(keyPair.publicKey);
    
    console.log(`🔑 Derived HPKE X25519 keypair: private(${privateKey.length}), public(${publicKey ? publicKey.length : 'undefined'})`);
    
    return { publicKey: new Uint8Array(publicKey), privateKey };
  } catch (error) {
    console.error('❌ HPKE X25519 key derivation failed:', error.message);
    throw new Error(`HPKE key derivation failed: ${error.message}`);
  }
}

/**
 * Encrypt entry data using HPKE (X25519 + AES-256-GCM)
 * 
 * @param {Uint8Array} recipientPublicKey - X25519 public key
 * @param {string} name - Entry name
 * @param {string} secret - Secret data to encrypt
 * @returns {Promise<{hpkeBlob: string, deletionHash: string}>}
 */
export async function encryptEntry(recipientPublicKey, name, secret) {
  try {
    console.log(`🔐 Encrypting entry with HPKE: ${name}`);
    console.log(`🔑 Using X25519 public key (${recipientPublicKey.length} bytes)`);
    
    // Create entry metadata (used as Additional Authenticated Data)
    const metadata = {
      name,
      creation_time: Math.floor(Date.now() / 1000),
      version: 1 // Crypto agility version number (implies X25519-HKDF-SHA256-AES256GCM)
    };
    
    // Generate deletion pre-hash
    const deletionPreHash = crypto.getRandomValues(new Uint8Array(32));
    
    // Calculate deletion hash (SHA256 of deletion pre-hash)
    const deletionHashBuffer = await crypto.subtle.digest('SHA-256', deletionPreHash);
    const deletionHash = new Uint8Array(deletionHashBuffer);
    
    // Add deletion hash to metadata for authentication
    metadata.delete_hash = Array.from(deletionHash);
    
    // Create plaintext payload
    const plaintextData = {
      secret,
      deletion_pre_hash: Array.from(deletionPreHash)
    };
    const plaintext = new TextEncoder().encode(JSON.stringify(plaintextData));
    
    // Prepare Additional Authenticated Data (metadata with deletion hash)
    const aad = new TextEncoder().encode(JSON.stringify(metadata));
    
    // Deserialize recipient public key
    const recipientKey = await hpkeSuite.kem.deserializePublicKey(recipientPublicKey);
    
    // Create HPKE sender context
    const sender = await hpkeSuite.createSenderContext({
      recipientPublicKey: recipientKey,
    });
    
    // Encrypt with HPKE (includes the encapsulated key)
    const ciphertext = await sender.seal(plaintext, aad);
    
    console.log(`✅ HPKE encryption successful`);
    console.log(`📦 Ciphertext size: ${ciphertext.byteLength} bytes`);
    console.log(`🔑 Encapsulated key size: ${sender.enc.byteLength} bytes`);
    
    // Create HPKE blob format: [metadata_length][metadata][enc_length][enc][ciphertext]
    const hpkeBlob = createHPKEBlob(metadata, sender.enc, ciphertext);
    
    return {
      hpkeBlob: btoa(String.fromCharCode.apply(null, Array.from(hpkeBlob))),
      deletionHash: btoa(String.fromCharCode.apply(null, Array.from(deletionHash)))
    };
  } catch (error) {
    console.error('❌ HPKE encryption failed:', error.message);
    throw new Error(`HPKE encryption failed: ${error.message}`);
  }
}

/**
 * Decrypt entry data using HPKE (X25519 + AES-256-GCM)
 * 
 * @param {string} hpkeBlobBase64 - Base64 encoded HPKE blob
 * @param {Uint8Array} privateKey - X25519 private key
 * @returns {Promise<{name: string, secret: string, deletionPreHash: Uint8Array}>}
 */
export async function decryptEntry(hpkeBlobBase64, privateKey) {
  try {
    const blobBytes = new Uint8Array(atob(hpkeBlobBase64).split('').map(c => c.charCodeAt(0)));
    
    console.log(`🔓 Decrypting HPKE entry`);
    console.log(`📦 Blob size: ${blobBytes.length} bytes`);
    console.log(`🔑 Using X25519 private key (${privateKey.length} bytes)`);
    
    // Parse HPKE blob format
    const { metadata, enc, ciphertext } = parseHPKEBlob(blobBytes);
    
    console.log(`📋 Metadata: ${JSON.stringify(metadata)}`);
    console.log(`🔑 Encapsulated key size: ${enc.length} bytes`);
    console.log(`📦 Ciphertext size: ${ciphertext.length} bytes`);
    
    // Check if this is a v1 HPKE blob
    if (metadata.version !== 1) {
      throw new Error(`Unsupported HPKE version: ${metadata.version}. Expected 1`);
    }
    
    // Prepare Additional Authenticated Data (metadata)
    const aad = new TextEncoder().encode(JSON.stringify(metadata));
    
    // Derive the full keypair from private key
    const keyPair = await hpkeSuite.kem.deriveKeyPair(privateKey);
    
    // Create HPKE recipient context
    const recipient = await hpkeSuite.createRecipientContext({
      recipientKey: keyPair,
      enc: enc,
    });
    
    // Decrypt with HPKE
    const decryptedBuffer = await recipient.open(ciphertext, aad);
    
    console.log(`✅ HPKE decryption successful`);
    
    // Parse decrypted data
    const plaintext = new TextDecoder().decode(decryptedBuffer);
    const plaintextData = JSON.parse(plaintext);
    
    return {
      name: metadata.name,
      secret: plaintextData.secret,
      deletionPreHash: new Uint8Array(plaintextData.deletion_pre_hash)
    };
  } catch (error) {
    console.error('❌ HPKE decryption failed:', error.message);
    console.error('❌ Error details:', error.stack);
    throw new Error(`HPKE decryption failed: ${error.message}`);
  }
}

/**
 * Create HPKE blob format: [metadata_length][metadata][enc_length][enc][ciphertext]
 * 
 * @param {Object} metadata - Entry metadata
 * @param {Uint8Array} enc - Encapsulated key from HPKE
 * @param {Uint8Array} ciphertext - Encrypted data
 * @returns {Uint8Array} - Formatted HPKE blob
 */
function createHPKEBlob(metadata, enc, ciphertext) {
  const metadataBytes = new TextEncoder().encode(JSON.stringify(metadata));
  
  // Ensure enc and ciphertext are Uint8Arrays
  const encBytes = new Uint8Array(enc);
  const ciphertextBytes = new Uint8Array(ciphertext);
  
  // Calculate total size
  const totalSize = 4 + metadataBytes.length + 4 + encBytes.length + ciphertextBytes.length;
  const blob = new Uint8Array(totalSize);
  
  let offset = 0;
  
  // Write metadata length (4 bytes, little-endian)
  const metadataLengthView = new DataView(blob.buffer, blob.byteOffset + offset, 4);
  metadataLengthView.setUint32(0, metadataBytes.length, true);
  offset += 4;
  
  // Write metadata
  blob.set(metadataBytes, offset);
  offset += metadataBytes.length;
  
  // Write enc length (4 bytes, little-endian)
  const encLengthView = new DataView(blob.buffer, blob.byteOffset + offset, 4);
  encLengthView.setUint32(0, encBytes.length, true);
  offset += 4;
  
  // Write encapsulated key
  blob.set(encBytes, offset);
  offset += encBytes.length;
  
  // Write ciphertext
  blob.set(ciphertextBytes, offset);
  
  return blob;
}

/**
 * Parse HPKE blob format: [metadata_length][metadata][enc_length][enc][ciphertext]
 * 
 * @param {Uint8Array} blobBytes - HPKE blob bytes
 * @returns {Object} - Parsed components
 */
function parseHPKEBlob(blobBytes) {
  let offset = 0;
  
  // Read metadata length (4 bytes, little-endian)
  if (blobBytes.length < 4) {
    throw new Error('Invalid HPKE blob: too short for metadata length');
  }
  const metadataLengthView = new DataView(blobBytes.buffer, blobBytes.byteOffset + offset, 4);
  const metadataLength = metadataLengthView.getUint32(0, true);
  offset += 4;
  
  // Read metadata
  if (blobBytes.length < offset + metadataLength) {
    throw new Error('Invalid HPKE blob: too short for metadata');
  }
  const metadataBytes = blobBytes.slice(offset, offset + metadataLength);
  const metadata = JSON.parse(new TextDecoder().decode(metadataBytes));
  offset += metadataLength;
  
  // Read enc length (4 bytes, little-endian)
  if (blobBytes.length < offset + 4) {
    throw new Error('Invalid HPKE blob: too short for enc length');
  }
  const encLengthView = new DataView(blobBytes.buffer, blobBytes.byteOffset + offset, 4);
  const encLength = encLengthView.getUint32(0, true);
  offset += 4;
  
  // Read encapsulated key
  if (blobBytes.length < offset + encLength) {
    throw new Error('Invalid HPKE blob: too short for encapsulated key');
  }
  const enc = blobBytes.slice(offset, offset + encLength);
  offset += encLength;
  
  // Read ciphertext (rest of the blob)
  const ciphertext = blobBytes.slice(offset);
  
  return { metadata, enc, ciphertext };
}

/**
 * Check if a blob is HPKE v1 format (vs legacy AES-GCM)
 * 
 * @param {string} hpkeBlobBase64 - Base64 encoded blob
 * @returns {boolean} - True if HPKE v1, false if legacy
 */
export function isHPKEv1Blob(hpkeBlobBase64) {
  try {
    const blobBytes = new Uint8Array(atob(hpkeBlobBase64).split('').map(c => c.charCodeAt(0)));
    const { metadata } = parseHPKEBlob(blobBytes);
    return metadata.version === 1;
  } catch (error) {
    // If parsing fails, assume it's legacy format
    return false;
  }
}

/**
 * Store public key locally for Level 1 authentication
 * 
 * @param {Uint8Array} publicKey - X25519 public key
 */
export function storePublicKeyLocally(publicKey) {
  const publicKeyBase64 = btoa(String.fromCharCode.apply(null, Array.from(publicKey)));
  localStorage.setItem('evault-hpke-public-key-v2', publicKeyBase64);
  console.log(`🔑 Stored HPKE v1 public key locally (${publicKey.length} bytes)`);
}

/**
 * Get locally stored public key for Level 1 authentication
 * 
 * @returns {Uint8Array|null} - X25519 public key or null if not found
 */
export function getStoredPublicKey() {
  try {
    const publicKeyBase64 = localStorage.getItem('evault-hpke-public-key-v2');
    if (!publicKeyBase64) {
      return null;
    }
    
    return new Uint8Array(atob(publicKeyBase64).split('').map(c => c.charCodeAt(0)));
  } catch (error) {
    // If base64 decoding fails, return null and log the error
    console.warn('⚠️  Failed to decode stored public key:', error.message);
    return null;
  }
}

/**
 * Clear locally stored public key (when locking vault)
 */
export function clearStoredPublicKey() {
  localStorage.removeItem('evault-hpke-public-key-v2');
  // Also clear legacy key if it exists
  localStorage.removeItem('evault-hpke-public-key');
  console.log(`🔒 Cleared locally stored HPKE keys`);
}

/**
 * Check if user needs to migrate from legacy key storage
 * This helps transition users from the old AES-GCM approach to HPKE v1
 * 
 * @returns {boolean} - True if migration is needed
 */
export function needsKeyMigration() {
  const hasLegacyKey = localStorage.getItem('evault-hpke-public-key') !== null;
  const hasNewKey = localStorage.getItem('evault-hpke-public-key-v2') !== null;
  
  // Migration needed if user has legacy key but no new key
  return hasLegacyKey && !hasNewKey;
}

/**
 * Clear legacy key storage after successful migration
 */
export function clearLegacyKey() {
  localStorage.removeItem('evault-hpke-public-key');
  console.log(`🧹 Cleared legacy key storage after migration`);
}

/**
 * Get deletion pre-hash from an encrypted entry
 * This is needed for secure deletion - the client must decrypt the entry
 * to extract the deletion pre-hash before requesting deletion from the server
 * 
 * @param {string} hpkeBlobBase64 - Base64 encoded HPKE blob
 * @param {Uint8Array} privateKey - X25519 private key for decryption
 * @returns {Promise<{name: string, deletionPreHash: string}>} Entry name and base64 deletion pre-hash
 */
export async function getDeletionPreHash(hpkeBlobBase64, privateKey) {
  try {
    console.log('🔓 Extracting deletion pre-hash from encrypted entry');
    
    // Decrypt the entry to get the deletion pre-hash
    const decrypted = await decryptEntry(hpkeBlobBase64, privateKey);
    
    // Convert deletion pre-hash to base64 for server transport
    const deletionPreHashBase64 = btoa(String.fromCharCode.apply(null, Array.from(decrypted.deletionPreHash)));
    
    console.log('✅ Successfully extracted deletion pre-hash');
    
    return {
      name: decrypted.name,
      deletionPreHash: deletionPreHashBase64
    };
  } catch (error) {
    console.error('❌ Failed to extract deletion pre-hash:', error.message);
    throw new Error(`Failed to extract deletion pre-hash: ${error.message}`);
  }
} 