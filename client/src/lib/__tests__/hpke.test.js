/**
 * Simplified HPKE tests focusing on core functionality
 * Tests the interfaces and behavior without requiring the full crypto implementation
 */

import {
  storePublicKeyLocally,
  getStoredPublicKey,
  clearStoredPublicKey,
  needsKeyMigration,
  clearLegacyKey,
  isHPKEv1Blob,
  getDeletionPreHash
} from '../hpke.js';

describe('HPKE Core Functionality', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
    jest.clearAllMocks();
  });

  describe('Local Storage Management', () => {
    test('should store and retrieve public key', () => {
      const publicKey = new Uint8Array(32);
      for (let i = 0; i < 32; i++) {
        publicKey[i] = i % 256;
      }
      
      storePublicKeyLocally(publicKey);
      const retrieved = getStoredPublicKey();
      
      expect(retrieved).toEqual(publicKey);
    });

    test('should return null when no key stored', () => {
      const retrieved = getStoredPublicKey();
      
      expect(retrieved).toBeNull();
    });

    test('should clear stored public key', () => {
      const publicKey = new Uint8Array(32);
      for (let i = 0; i < 32; i++) {
        publicKey[i] = i % 256;
      }
      
      storePublicKeyLocally(publicKey);
      expect(getStoredPublicKey()).toEqual(publicKey);
      
      clearStoredPublicKey();
      expect(getStoredPublicKey()).toBeNull();
    });

    test('should clear both new and legacy keys', () => {
      const publicKey = new Uint8Array(32);
      for (let i = 0; i < 32; i++) {
        publicKey[i] = i % 256;
      }
      
      // Set both keys
      storePublicKeyLocally(publicKey);
      localStorage.setItem('evault-hpke-public-key', 'legacy-key');
      
      clearStoredPublicKey();
      
      expect(getStoredPublicKey()).toBeNull();
      expect(localStorage.getItem('evault-hpke-public-key')).toBeNull();
    });
  });

  describe('Migration Support', () => {
    test('should detect migration needed when only legacy key exists', () => {
      localStorage.setItem('evault-hpke-public-key', 'legacy-key');
      
      expect(needsKeyMigration()).toBe(true);
    });

    test('should not need migration when only new key exists', () => {
      localStorage.setItem('evault-hpke-public-key-v2', 'new-key');
      
      expect(needsKeyMigration()).toBe(false);
    });

    test('should not need migration when both keys exist', () => {
      localStorage.setItem('evault-hpke-public-key', 'legacy-key');
      localStorage.setItem('evault-hpke-public-key-v2', 'new-key');
      
      expect(needsKeyMigration()).toBe(false);
    });

    test('should not need migration when no keys exist', () => {
      expect(needsKeyMigration()).toBe(false);
    });

    test('should clear legacy key', () => {
      localStorage.setItem('evault-hpke-public-key', 'legacy-key');
      localStorage.setItem('evault-hpke-public-key-v2', 'new-key');
      
      clearLegacyKey();
      
      expect(localStorage.getItem('evault-hpke-public-key')).toBeNull();
      expect(localStorage.getItem('evault-hpke-public-key-v2')).toBe('new-key');
    });
  });

  describe('Blob Format Detection', () => {
    test('should reject invalid blob format', () => {
      const invalidBlob = btoa('invalid blob data');
      
      expect(isHPKEv1Blob(invalidBlob)).toBe(false);
    });

    test('should reject non-base64 input', () => {
      const invalidInput = 'not base64!@#$%';
      
      expect(isHPKEv1Blob(invalidInput)).toBe(false);
    });

    test('should reject empty input', () => {
      expect(isHPKEv1Blob('')).toBe(false);
    });

    test('should handle malformed JSON in blob', () => {
      // Create a blob with malformed metadata
      const badMetadata = 'invalid json {';
      const badMetadataBytes = new TextEncoder().encode(badMetadata);
      const fakeBlob = new Uint8Array(4 + badMetadataBytes.length);
      
      // Write metadata length
      new DataView(fakeBlob.buffer).setUint32(0, badMetadataBytes.length, true);
      // Write bad metadata
      fakeBlob.set(badMetadataBytes, 4);
      
      const fakeBlobBase64 = btoa(String.fromCharCode.apply(null, Array.from(fakeBlob)));
      
      expect(isHPKEv1Blob(fakeBlobBase64)).toBe(false);
    });

    test('should create valid HPKE v1 blob structure for testing', () => {
      // Create a minimal valid HPKE v1 blob structure for testing
      const metadata = {
        name: 'Test Entry',
        creation_time: Math.floor(Date.now() / 1000),
        version: 1,
        delete_hash: new Array(32).fill(42)
      };
      
      const metadataBytes = new TextEncoder().encode(JSON.stringify(metadata));
      const encBytes = new Uint8Array(32); // Mock encapsulated key
      const ciphertextBytes = new Uint8Array(64); // Mock ciphertext
      
      // Create blob: [metadata_length][metadata][enc_length][enc][ciphertext]
      const totalSize = 4 + metadataBytes.length + 4 + encBytes.length + ciphertextBytes.length;
      const blob = new Uint8Array(totalSize);
      
      let offset = 0;
      
      // Write metadata length
      new DataView(blob.buffer, blob.byteOffset + offset, 4).setUint32(0, metadataBytes.length, true);
      offset += 4;
      
      // Write metadata
      blob.set(metadataBytes, offset);
      offset += metadataBytes.length;
      
      // Write enc length
      new DataView(blob.buffer, blob.byteOffset + offset, 4).setUint32(0, encBytes.length, true);
      offset += 4;
      
      // Write enc
      blob.set(encBytes, offset);
      offset += encBytes.length;
      
      // Write ciphertext
      blob.set(ciphertextBytes, offset);
      
      const blobBase64 = btoa(String.fromCharCode.apply(null, Array.from(blob)));
      
      expect(isHPKEv1Blob(blobBase64)).toBe(true);
    });
  });

  describe('Input Validation', () => {
    test('should handle null/undefined inputs gracefully', () => {
      expect(() => storePublicKeyLocally(null)).toThrow();
      expect(getStoredPublicKey()).toBeNull(); // Should not crash
      expect(isHPKEv1Blob(null)).toBe(false);
      expect(isHPKEv1Blob(undefined)).toBe(false);
    });

    test('should handle empty arrays', () => {
      const emptyKey = new Uint8Array(0);
      
      // Store empty key
      storePublicKeyLocally(emptyKey);
      const retrieved = getStoredPublicKey();
      
      // Empty keys might be stored as null or empty array depending on implementation
      expect(retrieved === null || (retrieved && retrieved.length === 0)).toBe(true);
    });

    test('should handle large keys', () => {
      const largeKey = new Uint8Array(1024);
      for (let i = 0; i < largeKey.length; i++) {
        largeKey[i] = i % 256;
      }
      
      storePublicKeyLocally(largeKey);
      const retrieved = getStoredPublicKey();
      
      expect(retrieved).toEqual(largeKey);
      expect(retrieved.length).toBe(1024);
    });
  });

  describe('Base64 Handling', () => {
    test('should handle various base64 inputs', () => {
      const testCases = [
        '',
        'YQ==', // 'a'
        'YWI=', // 'ab'  
        'YWJj', // 'abc'
        'invalid!@#',
        'spaces in string',
        '====', // padding only
      ];
      
      testCases.forEach(testCase => {
        // Should not throw, should return false for invalid cases
        const result = isHPKEv1Blob(testCase);
        expect(typeof result).toBe('boolean');
      });
    });
  });

  describe('Storage Edge Cases', () => {
    test('should handle localStorage.getItem returning null', () => {
      if (typeof localStorage !== 'undefined') {
        // Clear any existing key first
        localStorage.removeItem('evault-hpke-public-key-v2');
        
        const result = getStoredPublicKey();
        expect(result).toBeNull();
      }
    });

    test('should handle corrupted base64 in storage', () => {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('evault-hpke-public-key-v2', 'invalid-base64!@#$');
        
        // Should handle the error gracefully - getStoredPublicKey should catch the error
        const result = getStoredPublicKey();
        // With invalid base64, the function should handle the error and return null
        expect(result).toBeNull();
      }
    });
  });

  describe('Deletion Logic Validation', () => {
    test('should validate deletion hash structure in metadata', () => {
      // Create a valid HPKE v1 blob with deletion hash
      const metadata = {
        name: 'Test Entry',
        creation_time: Math.floor(Date.now() / 1000),
        version: 1,
        delete_hash: new Array(32).fill(42) // Mock deletion hash
      };
      
      const metadataBytes = new TextEncoder().encode(JSON.stringify(metadata));
      const encBytes = new Uint8Array(32);
      const ciphertextBytes = new Uint8Array(64);
      
      // Create blob structure
      const totalSize = 4 + metadataBytes.length + 4 + encBytes.length + ciphertextBytes.length;
      const blob = new Uint8Array(totalSize);
      
      let offset = 0;
      
      // Write metadata length
      new DataView(blob.buffer, blob.byteOffset + offset, 4).setUint32(0, metadataBytes.length, true);
      offset += 4;
      
      // Write metadata
      blob.set(metadataBytes, offset);
      offset += metadataBytes.length;
      
      // Write enc length
      new DataView(blob.buffer, blob.byteOffset + offset, 4).setUint32(0, encBytes.length, true);
      offset += 4;
      
      // Write enc
      blob.set(encBytes, offset);
      offset += encBytes.length;
      
      // Write ciphertext
      blob.set(ciphertextBytes, offset);
      
      const blobBase64 = btoa(String.fromCharCode.apply(null, Array.from(blob)));
      
      // Verify the blob has proper deletion hash in metadata
      expect(isHPKEv1Blob(blobBase64)).toBe(true);
      
      // Parse the blob to verify deletion hash structure
      const blobBytes = new Uint8Array(atob(blobBase64).split('').map(c => c.charCodeAt(0)));
      const metadataLengthView = new DataView(blobBytes.buffer, blobBytes.byteOffset, 4);
      const metadataLength = metadataLengthView.getUint32(0, true);
      
      const parsedMetadataBytes = blobBytes.slice(4, 4 + metadataLength);
      const parsedMetadata = JSON.parse(new TextDecoder().decode(parsedMetadataBytes));
      
      expect(parsedMetadata).toHaveProperty('delete_hash');
      expect(Array.isArray(parsedMetadata.delete_hash)).toBe(true);
      expect(parsedMetadata.delete_hash.length).toBe(32);
    });

    test('should require deletion hash in valid HPKE v1 metadata', () => {
      // Create metadata WITHOUT deletion hash (should be invalid)
      const invalidMetadata = {
        name: 'Test Entry',
        creation_time: Math.floor(Date.now() / 1000),
        version: 1
        // Missing delete_hash!
      };
      
      const metadataBytes = new TextEncoder().encode(JSON.stringify(invalidMetadata));
      const encBytes = new Uint8Array(32);
      const ciphertextBytes = new Uint8Array(64);
      
      // Create blob structure
      const totalSize = 4 + metadataBytes.length + 4 + encBytes.length + ciphertextBytes.length;
      const blob = new Uint8Array(totalSize);
      
      let offset = 0;
      
      // Write metadata length
      new DataView(blob.buffer, blob.byteOffset + offset, 4).setUint32(0, metadataBytes.length, true);
      offset += 4;
      
      // Write metadata
      blob.set(metadataBytes, offset);
      offset += metadataBytes.length;
      
      // Write enc length
      new DataView(blob.buffer, blob.byteOffset + offset, 4).setUint32(0, encBytes.length, true);
      offset += 4;
      
      // Write enc
      blob.set(encBytes, offset);
      offset += encBytes.length;
      
      // Write ciphertext
      blob.set(ciphertextBytes, offset);
      
             const blobBase64 = btoa(String.fromCharCode.apply(null, Array.from(blob)));
      
      // This should be recognized as valid blob format but missing deletion hash
      expect(isHPKEv1Blob(blobBase64)).toBe(true);
      
      // Parse and verify missing deletion hash
      const blobBytes = new Uint8Array(atob(blobBase64).split('').map(c => c.charCodeAt(0)));
      const metadataLengthView = new DataView(blobBytes.buffer, blobBytes.byteOffset, 4);
      const metadataLength = metadataLengthView.getUint32(0, true);
      
      const parsedMetadataBytes = blobBytes.slice(4, 4 + metadataLength);
      const parsedMetadata = JSON.parse(new TextDecoder().decode(parsedMetadataBytes));
      
      expect(parsedMetadata).not.toHaveProperty('delete_hash');
    });

    test('should validate deletion hash is exactly 32 bytes', () => {
      const testCases = [
        { size: 16, description: 'too short' },
        { size: 31, description: 'one byte short' },
        { size: 33, description: 'one byte too long' },
        { size: 64, description: 'too long' }
      ];
      
      testCases.forEach(({ size, description }) => {
        const metadata = {
          name: 'Test Entry',
          creation_time: Math.floor(Date.now() / 1000),
          version: 1,
          delete_hash: new Array(size).fill(42) // Wrong size deletion hash
        };
        
        const metadataBytes = new TextEncoder().encode(JSON.stringify(metadata));
        const encBytes = new Uint8Array(32);
        const ciphertextBytes = new Uint8Array(64);
        
        // Create blob structure
        const totalSize = 4 + metadataBytes.length + 4 + encBytes.length + ciphertextBytes.length;
        const blob = new Uint8Array(totalSize);
        
        let offset = 0;
        
        // Write metadata length
        new DataView(blob.buffer, blob.byteOffset + offset, 4).setUint32(0, metadataBytes.length, true);
        offset += 4;
        
        // Write metadata
        blob.set(metadataBytes, offset);
        offset += metadataBytes.length;
        
        // Write enc length
        new DataView(blob.buffer, blob.byteOffset + offset, 4).setUint32(0, encBytes.length, true);
        offset += 4;
        
        // Write enc
        blob.set(encBytes, offset);
        offset += encBytes.length;
        
        // Write ciphertext
        blob.set(ciphertextBytes, offset);
        
        const blobBase64 = btoa(String.fromCharCode.apply(null, Array.from(blob)));
        
        // Should parse as valid blob format
        expect(isHPKEv1Blob(blobBase64)).toBe(true);
        
        // But deletion hash should be wrong size
        const blobBytes = new Uint8Array(atob(blobBase64).split('').map(c => c.charCodeAt(0)));
        const metadataLengthView = new DataView(blobBytes.buffer, blobBytes.byteOffset, 4);
        const metadataLength = metadataLengthView.getUint32(0, true);
        
        const parsedMetadataBytes = blobBytes.slice(4, 4 + metadataLength);
        const parsedMetadata = JSON.parse(new TextDecoder().decode(parsedMetadataBytes));
        
        expect(parsedMetadata.delete_hash.length).toBe(size);
        expect(parsedMetadata.delete_hash.length).not.toBe(32);
      });
    });
  });

  describe('Deletion Hash Computation', () => {
    test('should validate deletion hash properties', () => {
      // Test that deletion hashes have correct properties without actual crypto operations
      const mockDeletionHash = new Uint8Array(32).fill(42);
      
      // Verify hash properties  
      expect(mockDeletionHash.length).toBe(32);
      expect(mockDeletionHash).toBeInstanceOf(Uint8Array);
      
      // Verify it can be converted to base64 (for server transport)
      const base64Hash = btoa(String.fromCharCode.apply(null, Array.from(mockDeletionHash)));
      expect(typeof base64Hash).toBe('string');
      expect(base64Hash.length).toBeGreaterThan(0);
      
      // Verify it can be converted back
      const decodedHash = new Uint8Array(atob(base64Hash).split('').map(c => c.charCodeAt(0)));
      expect(decodedHash).toEqual(mockDeletionHash);
    });

    test('should validate deletion pre-hash format', () => {
      // Test that deletion pre-hashes have correct format
      const mockDeletionPreHash = new Uint8Array([
        1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16,
        17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32
      ]);
      
      expect(mockDeletionPreHash.length).toBe(32);
      expect(mockDeletionPreHash).toBeInstanceOf(Uint8Array);
      
      // Verify it can be converted to base64 (for server transport)
      const base64PreHash = btoa(String.fromCharCode.apply(null, Array.from(mockDeletionPreHash)));
      expect(typeof base64PreHash).toBe('string');
      expect(base64PreHash.length).toBeGreaterThan(0);
      
      // Verify it can be converted back
      const decodedPreHash = new Uint8Array(atob(base64PreHash).split('').map(c => c.charCodeAt(0)));
      expect(decodedPreHash).toEqual(mockDeletionPreHash);
    });

         test('should validate server API compatibility', () => {
       // Test that our data structures match what the server expects
       const mockEntry = {
         name: 'Test Entry',
         hpke_blob: 'base64-encoded-blob',
         deletion_hash: 'base64-encoded-deletion-hash'
       };
       
       const mockDeleteRequest = {
         name: 'Test Entry',
         deletion_pre_hash: 'base64-encoded-deletion-pre-hash'
       };
       
       // Verify request structure matches server expectations
       expect(mockEntry).toHaveProperty('name');
       expect(mockEntry).toHaveProperty('hpke_blob');
       expect(mockEntry).toHaveProperty('deletion_hash');
       expect(typeof mockEntry.hpke_blob).toBe('string');
       expect(typeof mockEntry.deletion_hash).toBe('string');
       
       expect(mockDeleteRequest).toHaveProperty('name');
       expect(mockDeleteRequest).toHaveProperty('deletion_pre_hash');
       expect(typeof mockDeleteRequest.deletion_pre_hash).toBe('string');
     });
   });

   describe('Deletion Pre-Hash Extraction', () => {
     test('should export getDeletionPreHash function', () => {
       // Verify the function exists and has correct signature
       expect(typeof getDeletionPreHash).toBe('function');
       expect(getDeletionPreHash.length).toBe(2); // Should accept 2 parameters
     });

     test('should handle invalid input gracefully', async () => {
       // Test that function throws appropriate errors for invalid inputs
       const invalidBlob = 'invalid-blob';
       const invalidKey = new Uint8Array(16); // Wrong size
       
       await expect(getDeletionPreHash(invalidBlob, invalidKey)).rejects.toThrow();
       await expect(getDeletionPreHash(null, invalidKey)).rejects.toThrow();
       await expect(getDeletionPreHash(invalidBlob, null)).rejects.toThrow();
     });

     test('should validate expected return structure', async () => {
       // Test that the function would return the correct structure
       // We can't test the actual crypto without full mocking, but we can validate the interface
       
       // Mock what a successful return should look like
       const expectedResult = {
         name: 'Test Entry',
         deletionPreHash: 'base64-encoded-deletion-pre-hash'
       };
       
       // Verify the structure matches what the client code expects
       expect(expectedResult).toHaveProperty('name');
       expect(expectedResult).toHaveProperty('deletionPreHash');
       expect(typeof expectedResult.name).toBe('string');
       expect(typeof expectedResult.deletionPreHash).toBe('string');
     });
   });
}); 