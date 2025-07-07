# eVault HPKE Migration Guide

## Overview

eVault has been upgraded from a simplified AES-GCM approach to proper **HPKE (Hybrid Public Key Encryption)** using **X25519 + AES-256-GCM**. This provides stronger security guarantees and follows RFC 9180 standards.

## What Changed

### Before (Legacy v0)
- **Algorithm**: Simplified AES-GCM with same key for encryption/decryption
- **Key Storage**: `evault-hpke-public-key` in localStorage
- **Blob Format**: `[metadata_length][metadata][iv_length][iv][ciphertext]`
- **Metadata Version**: `"1.0"` (string)

### After (HPKE v1)
- **Algorithm**: True HPKE with X25519 + HKDF-SHA256 + AES-256-GCM
- **Key Storage**: `evault-hpke-public-key-v2` in localStorage
- **Blob Format**: `[metadata_length][metadata][enc_length][enc][ciphertext]`
- **Metadata Version**: `1` (integer for crypto agility)
- **Metadata Fields**: `name`, `creation_time`, `version`, `delete_hash`

## Technical Benefits

1. **True Hybrid Encryption**: Each entry uses a unique ephemeral key
2. **Forward Secrecy**: Compromising long-term keys doesn't affect past entries
3. **Standards Compliance**: Follows RFC 9180 HPKE specification
4. **Better Security**: Proper key encapsulation mechanism (KEM)
5. **Authenticated Deletion**: Deletion hash is authenticated in metadata
6. **Consistency**: Matches Ocrypt's X25519 + AES-256-GCM usage

## Migration Process

### Automatic Migration
The system automatically handles migration:

1. **New Registrations**: Use HPKE v1 immediately
2. **Existing Users**: 
   - Legacy entries remain decryptable
   - New entries use HPKE v1
   - Key storage migrates on next PIN entry

### Backwards Compatibility
- ✅ **Legacy entries**: Still decrypt with old format
- ✅ **Mixed storage**: Both formats work simultaneously
- ✅ **Gradual migration**: No forced upgrade needed

## Implementation Details

### Key Derivation
```javascript
// HKDF from OpenADP long-term secret
const privateKey = HKDF(longTermSecret, 
  salt: 'evault-hpke-x25519-salt',
  info: 'evault-hpke-x25519-private-key-v2'
);

// X25519 public key generation
const keyPair = await hpkeSuite.kem.deriveKeyPair(privateKey);
const publicKey = await hpkeSuite.kem.serializePublicKey(keyPair.publicKey);
```

### Encryption Process
```javascript
// Generate deletion pre-hash and compute hash
const deletionPreHash = crypto.getRandomValues(new Uint8Array(32));
const deletionHash = await crypto.subtle.digest('SHA-256', deletionPreHash);

// Create metadata with authenticated deletion hash
const metadata = {
  name,
  creation_time: Math.floor(Date.now() / 1000),
  version: 1,
  delete_hash: Array.from(new Uint8Array(deletionHash))
};

// Create HPKE sender context
const sender = await hpkeSuite.createSenderContext({
  recipientPublicKey: recipientKey,
});

// Encrypt with metadata as AAD (includes deletion hash)
const ciphertext = await sender.seal(plaintext, aad);

// Blob includes encapsulated key
const blob = [metadata_length][metadata][enc_length][enc][ciphertext];
```

### Decryption Process
```javascript
// Auto-detect blob format
if (isHPKEv1Blob(blob)) {
  // Use HPKE v1 decryption
  const recipient = await hpkeSuite.createRecipientContext({
    recipientKey: keyPair,
    enc: encapsulatedKey,
  });
  return await recipient.open(ciphertext, aad);
} else {
  // Use legacy AES-GCM decryption
  return await decryptLegacyEntry(blob, privateKey);
}
```

## Security Improvements

### Before
- Same key used for all entries
- No ephemeral keys
- Vulnerable to key reuse attacks
- Not standards-compliant

### After
- Unique ephemeral key per entry
- Forward secrecy guaranteed
- RFC 9180 compliant
- Proper hybrid encryption

## Monitoring Migration

### Check Migration Status
```javascript
import { needsKeyMigration } from './src/lib/hpke.js';

if (needsKeyMigration()) {
  console.log('User needs to enter PIN to complete migration');
}
```

### Clear Legacy Data
```javascript
import { clearLegacyKey } from './src/lib/hpke.js';

// After successful migration
clearLegacyKey();
```

## Testing

The implementation has been thoroughly tested:
- ✅ Key derivation from OpenADP secrets
- ✅ X25519 + AES-256-GCM encryption/decryption
- ✅ Blob format detection
- ✅ Round-trip integrity
- ✅ Backwards compatibility

## Dependencies

Added HPKE libraries:
```json
{
  "@hpke/core": "^1.4.1",
  "@hpke/dhkem-x25519": "^1.4.1"
}
```

## Conclusion

This migration provides significant security improvements while maintaining full backwards compatibility. Users can continue using their existing vaults without interruption, and new entries benefit from proper HPKE encryption.

The implementation follows RFC 9180 standards and uses the same X25519 + AES-256-GCM combination as Ocrypt for consistency across the eVault ecosystem. 