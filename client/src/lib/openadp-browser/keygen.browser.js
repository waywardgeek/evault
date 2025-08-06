/**
 * Key generation and recovery for OpenADP
 * 
 * This module provides high-level functions for generating encryption keys using
 * the OpenADP distributed secret sharing system, matching the Python implementation exactly.
 * 
 * This module handles the complete workflow:
 * 1. Generate random secrets and split into shares
 * 2. Register shares with distributed servers
 * 3. Recover secrets from servers during decryption
 * 4. Derive encryption keys using cryptographic functions
 */

// Browser-compatible crypto
function randomBytes(size) {
    const bytes = new Uint8Array(size);
    crypto.getRandomValues(bytes);
    return bytes;
}

// Browser-compatible Buffer alternatives
function stringToUtf8Bytes(str) {
    return new TextEncoder().encode(str);
}

function bytesToHex(bytes) {
    return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

function bytesToBase64(bytes) {
    const binary = Array.from(bytes).map(b => String.fromCharCode(b)).join('');
    return btoa(binary);
}

function base64ToBytes(base64) {
    const binary = atob(base64);
    return new Uint8Array(binary.split('').map(c => c.charCodeAt(0)));
}

import {
    H, deriveEncKey, pointMul, pointCompress, pointDecompress,
    ShamirSecretSharing, recoverPointSecret, PointShare, Point2D, Point4D,
    expand, unexpand, Q, modInverse, sha256Hash, logPoint
} from './crypto.browser.js';
import { OpenADPClient, EncryptedOpenADPClient, ServerInfo } from './client.browser.js';
import * as debug from './debug.js';

/**
 * Authentication codes for OpenADP servers
 */
export class AuthCodes {
    constructor(baseAuthCode, serverAuthCodes, userId) {
        this.baseAuthCode = baseAuthCode;
        this.serverAuthCodes = serverAuthCodes;
        this.userId = userId;
    }
}

/**
 * Identity represents the primary key tuple for secret shares stored on servers
 */
export class Identity {
    constructor(uid, did, bid) {
        this.uid = uid;  // User ID - uniquely identifies the user
        this.did = did;  // Device ID - identifies the device/application  
        this.bid = bid;  // Backup ID - identifies the specific backup
    }
    
    toString() {
        return `UID=${this.uid}, DID=${this.did}, BID=${this.bid}`;
    }
}

/**
 * Result of encryption key generation
 */
export class GenerateEncryptionKeyResult {
    constructor(encryptionKey = null, error = null, serverInfos = null, threshold = null, authCodes = null) {
        this.encryptionKey = encryptionKey;
        this.error = error;
        this.serverInfos = serverInfos;
        this.threshold = threshold;
        this.authCodes = authCodes;
    }
}

/**
 * Result of encryption key recovery
 */
export class RecoverEncryptionKeyResult {
    constructor(encryptionKey = null, error = null, numGuesses = 0, maxGuesses = 0) {
        this.encryptionKey = encryptionKey;
        this.error = error;
        this.numGuesses = numGuesses; // Actual number of guesses used (from server responses)
        this.maxGuesses = maxGuesses; // Maximum guesses allowed (from server responses)
    }
}

/**
 * Convert user password to PIN bytes for cryptographic operations (matches Go PasswordToPin)
 */
export function passwordToPin(password) {
    // Use password bytes directly (no unnecessary hashing/truncation)
    return new TextEncoder().encode(password);
}

/**
 * Generate authentication codes for OpenADP servers (matches Python GenerateAuthCodes)
 * @param {string[]} serverUrls - List of server URLs
 * @param {string} [fixedSeed] - Optional fixed seed for testing (DO NOT use in production)
 */
export function generateAuthCodes(serverUrls, fixedSeed = null) {
    // Generate base authentication code (32 random bytes as hex)
    let baseAuthCode;
    if (fixedSeed) {
        // For testing: use a fixed seed to generate deterministic auth codes
        const seedHash = sha256Hash(stringToUtf8Bytes(fixedSeed));
        baseAuthCode = bytesToHex(seedHash);
    } else {
        // Production: use cryptographically secure random bytes
        const randomBytesArray = randomBytes(32);
        baseAuthCode = bytesToHex(randomBytesArray);
    }
    
    
    
    // Generate server-specific authentication codes
    const serverAuthCodes = {};
    for (const serverUrl of serverUrls) {
        // Derive server-specific code using SHA256 (same as Go/Python implementation)
        const combined = `${baseAuthCode}:${serverUrl}`;
        const hashBytes = sha256Hash(stringToUtf8Bytes(combined));
        const serverCode = bytesToHex(hashBytes);
        serverAuthCodes[serverUrl] = serverCode;
    }
    
    // Return with placeholder user_id (will be set by caller)
    return new AuthCodes(baseAuthCode, serverAuthCodes, "");
}

/**
 * Generate an encryption key using OpenADP distributed secret sharing
 */
export async function generateEncryptionKey(
    identity,
    password,
    maxGuesses = 10,
    expiration = 0,
    serverInfos = null
) {
    // Debug: Check what we received
    console.log('🔍 DEBUG - generateEncryptionKey received:', {
        identity: identity,
        identity_type: typeof identity,
        identity_constructor: identity?.constructor?.name,
        identity_uid: identity?.uid,
        identity_did: identity?.did,
        identity_bid: identity?.bid,
        password: password ? `${password.length} chars` : 'null/undefined'
    });
    
    // Input validation
    if (!identity) {
        return new GenerateEncryptionKeyResult(null, "Identity cannot be null");
    }
    
    if (!identity.uid) {
        console.log('🔍 DEBUG - identity.uid is:', identity.uid, 'type:', typeof identity.uid);
        return new GenerateEncryptionKeyResult(null, "UID cannot be empty");
    }
    
    if (!identity.did) {
        return new GenerateEncryptionKeyResult(null, "DID cannot be empty");
    }
    
    if (!identity.bid) {
        return new GenerateEncryptionKeyResult(null, "BID cannot be empty");
    }
    
    if (maxGuesses < 0) {
        return new GenerateEncryptionKeyResult(null, "Max guesses cannot be negative");
    }

    console.log(`OpenADP: Identity=${identity.toString()}`);

    try {
        // Step 1: Convert password to PIN
        const pin = passwordToPin(password);
        
        // Step 2: Check if we have servers
        if (!serverInfos || serverInfos.length === 0) {
            return new GenerateEncryptionKeyResult(null, "No OpenADP servers available");
        }
        
        // Step 3: Initialize encrypted clients for each server by fetching their public keys - PARALLELIZED
        console.log(`OpenADP: Initializing ${serverInfos.length} servers in parallel...`);
        
        const initializationPromises = serverInfos.map(async (serverInfo) => {
            try {
                // Create a basic client to fetch server info first
                const basicClient = new OpenADPClient(serverInfo.url, 5000);
                
                // Fetch server info to get the public key
                const serverInfoResponse = await basicClient.getServerInfoStandardized();
                
                let publicKey = null;
                if (serverInfoResponse.noiseNkPublicKey) {
                    try {
                        publicKey = base64ToBytes(serverInfoResponse.noiseNkPublicKey);
                    } catch (error) {
                        console.warn(`Invalid public key from server ${serverInfo.url}: ${error.message}`);
                        publicKey = null;
                    }
                }
                
                // Create encrypted client with the fetched public key
                const client = new EncryptedOpenADPClient(serverInfo.url, publicKey, 5000);
                await client.ping();
                
                if (publicKey) {
                    console.log(`OpenADP: Server ${serverInfo.url} - Using Noise-NK encryption`);
                } else {
                    console.log(`OpenADP: Server ${serverInfo.url} - No encryption (no public key)`);
                }
                
                return { serverInfo, client, serverUrl: serverInfo.url };
            } catch (error) {
                console.warn(`Server ${serverInfo.url} is not accessible: ${error.message}`);
                return null;
            }
        });
        
        // Wait for all server initializations to complete
        const initializationResults = await Promise.allSettled(initializationPromises);
        
        // Extract successful results
        const clients = [];
        const liveServerUrls = [];
        
        for (const result of initializationResults) {
            if (result.status === 'fulfilled' && result.value !== null) {
                clients.push(result.value.client);
                liveServerUrls.push(result.value.serverUrl);
            }
        }
        
        if (clients.length === 0) {
            return new GenerateEncryptionKeyResult(null, "No live servers available");
        }
        
        console.log(`OpenADP: Using ${clients.length} live servers`);
        
        // Step 4: Generate authentication codes for live servers
        let authCodes;
        if (debug.isDebugModeEnabled()) {
            // Use deterministic auth codes in debug mode
            const deterministicBaseAuthCode = debug.getDeterministicBaseAuthCode();
            const serverAuthCodes = {};
            for (const serverUrl of liveServerUrls) {
                // Derive server-specific code using SHA256 (same as Go/Python implementation)
                const combined = `${deterministicBaseAuthCode}:${serverUrl}`;
                const hashBytes = sha256Hash(stringToUtf8Bytes(combined));
                const serverCode = bytesToHex(hashBytes);
                serverAuthCodes[serverUrl] = serverCode;
            }
            authCodes = new AuthCodes(deterministicBaseAuthCode, serverAuthCodes, identity.uid);
        } else {
            authCodes = generateAuthCodes(liveServerUrls);
            authCodes.userId = identity.uid;
        }
        
        // Step 5: Calculate threshold - require majority of servers
        const threshold = Math.floor(clients.length / 2) + 1;
        console.log(`OpenADP: Using threshold ${threshold}/${clients.length} servers`);
        
        // Step 6: Generate secret for this encryption operation
        let secret = BigInt(0);
        if (debug.isDebugModeEnabled()) {
            // Use deterministic secret in debug mode
            const deterministicSecretHex = debug.getDeterministicMainSecret();
            secret = BigInt('0x' + deterministicSecretHex);
            debug.debugLog(`Main secret: 0x${deterministicSecretHex}`);
            debug.debugLog(`Secret (decimal): ${secret.toString()}`);
        } else {
            // SECURITY FIX: Use random secret for Shamir secret sharing, not deterministic
            // Generate random secret from 0 to Q-1
            // Note: secret can be 0 - this is valid for Shamir secret sharing
            const randomBytesArray = randomBytes(32);
            let secretBig = BigInt(0);
            for (let i = 0; i < randomBytesArray.length; i++) {
                secretBig = (secretBig << BigInt(8)) | BigInt(randomBytesArray[i]);
            }
            secret = secretBig % Q;
            console.log(`OpenADP: Generated random secret for encryption key derivation`);
        }
        
        // Step 7: Split secret into shares using Shamir secret sharing
        const shares = ShamirSecretSharing.splitSecret(secret, threshold, clients.length);
        console.log(`OpenADP: Split secret into ${shares.length} shares (threshold: ${threshold})`);
        
        // Step 8: Compute point H(uid, did, bid, pin) for point-based shares
        const hPoint = H(identity.uid, identity.did, identity.bid, pin); // U = H(uid, did, bid, pin)
        if (debug.isDebugModeEnabled()) {
            logPoint(`Computed U point for identity: UID=${identity.uid}, DID=${identity.did}, BID=${identity.bid}`, hPoint);
        }
        
        // Step 9.5: Compute S = secret * U (this is the point used for key derivation, like Go)
        const sPoint = pointMul(secret, hPoint); // S = secret * U
        if (debug.isDebugModeEnabled()) {
            logPoint("Computed S = secret * U", sPoint);
        }
        
        const hCompressed = pointCompress(hPoint);
        const hBase64 = bytesToBase64(hCompressed);
        
        // Step 10: Register shares with servers (encrypted communication)
        console.log(`OpenADP: Registering ${shares.length} shares with servers (threshold: ${threshold})...`);
        
        const version = 1;
        const registrationPromises = [];
        
        for (let i = 0; i < clients.length; i++) {
            const client = clients[i];
            const serverUrl = liveServerUrls[i];
            const [x, y] = shares[i];
            const authCode = authCodes.serverAuthCodes[serverUrl];
            
            // Convert Y coordinate to base64-encoded 32-byte little-endian format (per API spec)
            // Y is the Shamir share Y coordinate, not an elliptic curve point
            const yBig = y; // y is already BigInt
            
            // Convert BigInt to 32-byte little-endian array
            const yBytes = new Uint8Array(32);
            let yTemp = yBig;
            for (let byteIdx = 0; byteIdx < 32; byteIdx++) {
                yBytes[byteIdx] = Number(yTemp & 0xFFn);
                yTemp = yTemp >> 8n;
            }
            
            // Encode as base64
            const yString = bytesToBase64(yBytes);
            
            // Debug: Show what we're sending
            // Convert BigInt to hex string properly (big-endian)
            let yHex = yBig.toString(16).padStart(64, '0'); // 32 bytes = 64 hex chars
            

            
            const promise = client.registerSecret(
                authCode, identity.uid, identity.did, identity.bid, version, x, yString, maxGuesses, expiration, true
            );
            registrationPromises.push(promise);
        }
        
        // Wait for all registrations to complete
        const registrationResults = await Promise.allSettled(registrationPromises);
        
        let successCount = 0;
        for (let i = 0; i < registrationResults.length; i++) {
            const result = registrationResults[i];
            if (result.status === 'fulfilled' && result.value === true) {
                successCount++;
                console.log(`OpenADP: ✓ Registered share with server ${liveServerUrls[i]}`);
            } else {
                console.warn(`OpenADP: ✗ Failed to register share with server ${liveServerUrls[i]}: ${result.reason?.message || 'Unknown error'}`);
            }
        }
        
        // Create ServerInfo objects for the live servers (used in both success and error cases)
        const liveServerInfos = liveServerUrls.map(url => {
            const originalServerInfo = serverInfos.find(si => si.url === url);
            return originalServerInfo || { url: url, publicKey: "", name: "Unknown" };
        });
        
        if (successCount < threshold) {
            return new GenerateEncryptionKeyResult(
                null, 
                `Failed to register enough shares. Got ${successCount}/${clients.length}, need ${threshold}`,
                liveServerInfos,
                threshold,
                authCodes
            );
        }
        
        console.log(`OpenADP: Successfully registered ${successCount}/${clients.length} shares`);
        
        // Step 11: Generate encryption key from S = secret * U (like Go)
        const sPointCompressed = pointCompress(sPoint);
        const encryptionKey = deriveEncKey(sPoint);
        console.log(`OpenADP: Generated 32-byte encryption key from S = secret * U`);
        
        return new GenerateEncryptionKeyResult(
            encryptionKey,
            null,
            liveServerInfos,
            threshold,
            authCodes
        );
        
    } catch (error) {
        console.error(`OpenADP encryption key generation failed: ${error.message}`);
        return new GenerateEncryptionKeyResult(null, `Key generation failed: ${error.message}`);
    }
}

/**
 * Recover an encryption key using OpenADP distributed secret sharing
 */
export async function recoverEncryptionKey(
    identity,
    password,
    serverInfos,
    threshold,
    authCodes
) {
    // Input validation
    if (!identity) {
        return new RecoverEncryptionKeyResult(null, "Identity cannot be null");
    }
    
    if (!identity.uid) {
        return new RecoverEncryptionKeyResult(null, "UID cannot be empty");
    }
    
    if (!identity.did) {
        return new RecoverEncryptionKeyResult(null, "DID cannot be empty");
    }
    
    if (!identity.bid) {
        return new RecoverEncryptionKeyResult(null, "BID cannot be empty");
    }

    if (!serverInfos || serverInfos.length === 0) {
        return new RecoverEncryptionKeyResult(null, "No OpenADP servers available");
    }

    if (!authCodes) {
        return new RecoverEncryptionKeyResult(null, "Authentication codes required");
    }

    console.log(`OpenADP: Recovery - Identity=${identity.toString()}`);

    try {
        // Step 1: Convert password to PIN
        const pin = passwordToPin(password);
        
        // Step 2: Fetch remaining guesses for all servers and select the best ones
        console.log("OpenADP: Fetching remaining guesses from servers...");
        const serverInfosWithGuesses = await fetchRemainingGuessesForServers(identity, serverInfos);
        
        // Calculate threshold for server selection
        const calculatedThreshold = Math.floor(serverInfosWithGuesses.length / 2) + 1; // Standard majority threshold: floor(N/2) + 1
        
        // Select servers intelligently based on remaining guesses
        const selectedServerInfos = selectServersByRemainingGuesses(serverInfosWithGuesses, calculatedThreshold);
        
        // Initialize encrypted clients for selected servers - PARALLELIZED
        console.log(`OpenADP: Initializing ${selectedServerInfos.length} recovery servers in parallel...`);
        
        const clientInitPromises = selectedServerInfos.map(async (serverInfo) => {
            let publicKey = null;
            
            if (serverInfo.publicKey) {
                try {
                    if (serverInfo.publicKey.startsWith("ed25519:")) {
                        const keyB64 = serverInfo.publicKey.substring(8);
                        publicKey = new Uint8Array(base64ToBytes(keyB64));
                    } else {
                        publicKey = new Uint8Array(base64ToBytes(serverInfo.publicKey));
                    }
                } catch (error) {
                    console.warn(`Invalid public key for server ${serverInfo.url}: ${error.message}`);
                    publicKey = null;
                }
            }
            
            const client = new EncryptedOpenADPClient(serverInfo.url, publicKey, 5000);
            try {
                await client.ping();
                return { client, serverInfo };
            } catch (error) {
                console.warn(`Server ${serverInfo.url} is not accessible: ${error.message}`);
                return null;
            }
        });
        
        // Wait for all client initializations to complete
        const clientInitResults = await Promise.allSettled(clientInitPromises);
        
        // Extract successful results
        const clients = [];
        const liveServerUrls = [];
        const liveServerInfos = [];
        
        for (const result of clientInitResults) {
            if (result.status === 'fulfilled' && result.value !== null) {
                clients.push(result.value.client);
                liveServerUrls.push(result.value.serverInfo.url);
                liveServerInfos.push(result.value.serverInfo);
            }
        }
        
        if (clients.length < threshold) {
            return new RecoverEncryptionKeyResult(
                null, 
                `Not enough live servers. Have ${clients.length}, need ${threshold}`
            );
        }
        
        console.log(`OpenADP: Recovery using ${clients.length} live servers (threshold: ${threshold})`);
        
        // Step 4: Create cryptographic context (same as encryption)
        const uPoint = H(identity.uid, identity.did, identity.bid, pin);
        
        // Debug: Show the U point that we're using for recovery (convert to affine)
        const uPointAffine = unexpand(uPoint);
        
        // Generate random r for blinding (0 < r < Q)
        const randomBytesArray = randomBytes(32);
        let r = 0n;
        for (let i = 0; i < 32; i++) {
            r = (r << 8n) | BigInt(randomBytesArray[i]);
        }
        r = r % Q;
        if (r === 0n) {
            r = 1n; // Ensure r is not zero
        }
        
        // Compute r^-1 mod q
        const rInv = modInverse(r, Q);
        
        const bPoint = pointMul(r, uPoint);
        const bPointAffine = unexpand(bPoint);
        const bCompressed = pointCompress(bPoint);
        const bBase64 = bytesToBase64(bCompressed);
        

        
        // Step 5: Recover shares from servers
        console.log(`OpenADP: Recovering shares from servers...`);
        const recoveryPromises = [];
        
        for (let i = 0; i < clients.length; i++) { // Use all available servers (already filtered by remaining guesses)
            const client = clients[i];
            const serverUrl = liveServerUrls[i];
            const serverInfo = liveServerInfos[i];
            const authCode = authCodes.serverAuthCodes[serverUrl];
            
            if (!authCode) {
                console.warn(`No auth code for server ${serverUrl}`);
                continue;
            }
            
            // Get current guess number for this backup from the server
            let guessNum = 0; // Default to 0 for first guess (0-based indexing)
            try {
                const backups = await client.listBackups(identity.uid, false, null);
                // Find our backup in the list using the complete primary key (UID, DID, BID)
                for (const backup of backups) {
                    if (backup.uid === identity.uid && 
                        backup.did === identity.did && 
                        backup.bid === identity.bid) {
                        guessNum = parseInt(backup.num_guesses || 0);
                        break;
                    }
                }
            } catch (error) {
                console.warn(`Warning: Could not list backups from server ${i+1}: ${error.message}`);
            }
            
            // Try recovery with current guess number, retry once if guess number is wrong
            const recoverWithRetry = async () => {
                try {
                    const result = await client.recoverSecret(
                        authCode, identity.uid, identity.did, identity.bid, bBase64, guessNum, true
                    );
                    return { serverUrl, serverInfo, result };
                } catch (error) {
                    // If we get a guess number error, try to parse the expected number and retry
                    if (error.message && error.message.includes("expecting guess_num =")) {
                        try {
                            const errorStr = error.message;
                            const idx = errorStr.indexOf("expecting guess_num = ");
                            if (idx !== -1) {
                                const expectedStr = errorStr.substring(idx + "expecting guess_num = ".length);
                                const spaceIdx = expectedStr.indexOf(" ");
                                const expectedGuess = parseInt(spaceIdx !== -1 ? expectedStr.substring(0, spaceIdx) : expectedStr);
                                console.log(`Server ${i+1} (${serverUrl}): Retrying with expected guess_num = ${expectedGuess}`);
                                const retryResult = await client.recoverSecret(
                                    authCode, identity.uid, identity.did, identity.bid, bBase64, expectedGuess, true
                                );
                                return { serverUrl, serverInfo, result: retryResult };
                            } else {
                                throw error;
                            }
                        } catch (retryError) {
                            console.warn(`Server ${i+1} (${serverUrl}) recovery failed: ${error.message}`);
                            return { serverUrl, serverInfo, error };
                        }
                    } else {
                        console.warn(`Server ${i+1} (${serverUrl}) recovery failed: ${error.message}`);
                        return { serverUrl, serverInfo, error };
                    }
                }
            };
            
            recoveryPromises.push(recoverWithRetry());
        }
        
        const recoveryResults = await Promise.allSettled(recoveryPromises);
        
        // Process recovery results
        const validShares = [];
        let actualNumGuesses = 0;
        let actualMaxGuesses = 0;
        
        for (const settledResult of recoveryResults) {
            if (settledResult.status === 'fulfilled') {
                const { serverUrl, serverInfo, result, error } = settledResult.value;
                if (error) {
                    console.warn(`OpenADP: Failed to recover from ${serverUrl}: ${error.message}`);
                } else {
                    // Capture guess information from server response (first successful server)
                    if (actualNumGuesses === 0 && actualMaxGuesses === 0) {
                        if (result.num_guesses !== undefined) {
                            actualNumGuesses = parseInt(result.num_guesses);
                        }
                        if (result.max_guesses !== undefined) {
                            actualMaxGuesses = parseInt(result.max_guesses);
                        }
                    }
                    
                    const guessesStr = serverInfo.remainingGuesses === -1 ? "unknown" : serverInfo.remainingGuesses.toString();
                    console.log(`OpenADP: ✓ Recovered share from ${serverUrl} (${guessesStr} remaining guesses)`);
                    
                    // Convert si_b back to point and then to share
                    try {
                        const siBBytes = base64ToBytes(result.si_b);
                        const siBPoint = pointDecompress(siBBytes);
                        const siBPoint2D = new Point2D(siBPoint.x, siBPoint.y);
                        
                        validShares.push(new PointShare(result.x, siBPoint2D));
                    } catch (shareError) {
                        console.warn(`Failed to process share from ${serverUrl}: ${shareError.message}`);
                    }
                }
            }
        }
        
        if (validShares.length < threshold) {
            return new RecoverEncryptionKeyResult(
                null,
                `Not enough valid shares recovered. Got ${validShares.length}, need ${threshold}`,
                actualNumGuesses,
                actualMaxGuesses
            );
        }
        
        console.log(`OpenADP: Recovered ${validShares.length} valid shares`);
        
        // Step 6: Reconstruct secret using point-based recovery (like Go recover_sb)
        console.log(`OpenADP: Reconstructing secret from ${validShares.length} point shares...`);
        
        // Use point-based Lagrange interpolation to recover s*B (like Go RecoverPointSecret)
        // Use ALL available shares, not just threshold (matches Go implementation)
        const recoveredSB = recoverPointSecret(validShares);
        
        // Apply r^-1 to get the original secret point: s*U = r^-1 * (s*B)
        // This matches Go: rec_s_point = crypto.point_mul(r_inv, crypto.expand(rec_sb))
        const recoveredSB4D = expand(recoveredSB);
        const originalSU = pointMul(rInv, recoveredSB4D);
        
        // Step 7: Derive same encryption key
        const encryptionKey = deriveEncKey(originalSU);
        console.log(`OpenADP: Successfully recovered encryption key`);
        
        return new RecoverEncryptionKeyResult(encryptionKey, null, actualNumGuesses, actualMaxGuesses);
        
    } catch (error) {
        console.error(`OpenADP encryption key recovery failed: ${error.message}`);
        return new RecoverEncryptionKeyResult(null, `Key recovery failed: ${error.message}`, 0, 0);
    }
}

/**
 * Fetch remaining guesses for each server and update ServerInfo objects.
 * 
 * @param {Identity} identity - The identity to check remaining guesses for
 * @param {ServerInfo[]} serverInfos - List of ServerInfo objects to update
 * @returns {Promise<ServerInfo[]>} Updated list of ServerInfo objects with remainingGuesses populated
 */
async function fetchRemainingGuessesForServers(identity, serverInfos) {
    console.log(`OpenADP: Fetching remaining guesses from ${serverInfos.length} servers in parallel...`);
    
    const fetchPromises = serverInfos.map(async (serverInfo) => {
        // Create a copy to avoid modifying the original
        const updatedServerInfo = new ServerInfo(
            serverInfo.url,
            serverInfo.publicKey,
            serverInfo.country,
            serverInfo.remainingGuesses
        );
        
        try {
            // Parse public key if available
            let publicKey = null;
            if (serverInfo.publicKey) {
                try {
                    let keyStr = serverInfo.publicKey;
                    if (keyStr.startsWith("ed25519:")) {
                        keyStr = keyStr.substring(8);
                    }
                    publicKey = base64ToBytes(keyStr);
                } catch (e) {
                    console.warn(`Warning: Invalid public key for server ${serverInfo.url}:`, e);
                }
            }
            
            // Create client and try to fetch backup info
            const client = new EncryptedOpenADPClient(serverInfo.url, publicKey, 5000);
            await client.ping(); // Test connectivity
            
            // List backups to get remaining guesses
            const backups = await client.listBackups(identity.uid, false, null);
            
            // Find our specific backup
            let remainingGuesses = -1; // Default to unknown
            for (const backup of backups) {
                if (backup.uid === identity.uid && 
                    backup.did === identity.did && 
                    backup.bid === identity.bid) {
                    const numGuesses = parseInt(backup.num_guesses || 0);
                    const maxGuesses = parseInt(backup.max_guesses || 10);
                    remainingGuesses = Math.max(0, maxGuesses - numGuesses);
                    break;
                }
            }
            
            updatedServerInfo.remainingGuesses = remainingGuesses;
            console.log(`OpenADP: Server ${serverInfo.url} has ${remainingGuesses === -1 ? 'unknown' : remainingGuesses} remaining guesses`);
            
            return updatedServerInfo;
        } catch (error) {
            console.warn(`Warning: Could not fetch remaining guesses from server ${serverInfo.url}:`, error.message);
            // Return the original info with unknown remaining guesses
            updatedServerInfo.remainingGuesses = -1;
            return updatedServerInfo;
        }
    });
    
    // Wait for all fetch operations to complete
    const fetchResults = await Promise.allSettled(fetchPromises);
    
    // Extract successful results
    const updatedServerInfos = [];
    for (const result of fetchResults) {
        if (result.status === 'fulfilled') {
            updatedServerInfos.push(result.value);
        } else {
            console.warn(`Failed to fetch remaining guesses:`, result.reason);
        }
    }
    
    return updatedServerInfos;
}

/**
 * Select servers intelligently based on remaining guesses.
 * 
 * Strategy:
 * 1. Filter out servers with 0 remaining guesses (exhausted) or unknown guesses (-1)
 * 2. Sort by remaining guesses (descending) to use servers with most guesses first
 * 3. Servers with unknown remaining guesses (-1) are treated as having 0 guesses (filtered out)
 * 4. If no servers with known positive guesses, fall back to unknown servers as last resort
 * 5. Select threshold + 2 servers for redundancy
 * 
 * @param {ServerInfo[]} serverInfos - List of ServerInfo objects with remainingGuesses populated
 * @param {number} threshold - Minimum number of servers needed
 * @returns {ServerInfo[]} Selected servers sorted by remaining guesses (descending)
 */
function selectServersByRemainingGuesses(serverInfos, threshold) {
    // Filter servers by remaining guesses priority:
    // 1. Servers with known positive guesses (> 0) - highest priority
    // 2. Servers with unknown guesses (-1) - medium priority 
    // 3. Servers with 0 guesses - lowest priority (exhausted, avoid if possible)
    
    // First, try servers with known positive remaining guesses
    const serversWithKnownGuesses = serverInfos.filter(s => s.remainingGuesses > 0);
    
    if (serversWithKnownGuesses.length >= threshold) {
        // Sort by remaining guesses (descending) - servers with more guesses first
        const sortedServers = serversWithKnownGuesses.sort((a, b) => {
            return b.remainingGuesses - a.remainingGuesses;
        });
        
        const numToSelect = Math.min(sortedServers.length, threshold + 2);
        const selectedServers = sortedServers.slice(0, numToSelect);
        
        console.log(`OpenADP: Selected ${selectedServers.length} servers with known positive remaining guesses:`);
        selectedServers.forEach((server, i) => {
            console.log(`  ${i+1}. ${server.url} (${server.remainingGuesses} remaining guesses)`);
        });
        
        return selectedServers;
    }
    
    // If not enough servers with known positive guesses, add servers with unknown guesses
    const serversWithUnknownGuesses = serverInfos.filter(s => s.remainingGuesses === -1);
    const combinedServers = [...serversWithKnownGuesses, ...serversWithUnknownGuesses];
    
    if (combinedServers.length >= threshold) {
        // Sort with known positive guesses first, then unknown
        const sortedServers = combinedServers.sort((a, b) => {
            // Known positive guesses come first, sorted by remaining guesses (descending)
            if (a.remainingGuesses > 0 && b.remainingGuesses > 0) {
                return b.remainingGuesses - a.remainingGuesses;
            }
            if (a.remainingGuesses > 0 && b.remainingGuesses === -1) {
                return -1; // a comes first
            }
            if (a.remainingGuesses === -1 && b.remainingGuesses > 0) {
                return 1; // b comes first
            }
            // Both are unknown (-1), maintain original order
            return 0;
        });
        
        const numToSelect = Math.min(sortedServers.length, threshold + 2);
        const selectedServers = sortedServers.slice(0, numToSelect);
        
        console.log(`OpenADP: Selected ${selectedServers.length} servers (some with unknown remaining guesses):`);
        selectedServers.forEach((server, i) => {
            const guessesStr = server.remainingGuesses === -1 ? "unknown" : server.remainingGuesses.toString();
            console.log(`  ${i+1}. ${server.url} (${guessesStr} remaining guesses)`);
        });
        
        return selectedServers;
    }
    
    // Last resort: use all available servers (including exhausted ones)
    console.warn("Warning: Not enough servers with positive or unknown guesses. Using all available servers as last resort!");
    
    // Sort all servers with preference: positive > unknown > exhausted
    const allServersSorted = serverInfos.sort((a, b) => {
        if (a.remainingGuesses > 0 && b.remainingGuesses <= 0) return -1;
        if (a.remainingGuesses <= 0 && b.remainingGuesses > 0) return 1;
        if (a.remainingGuesses > 0 && b.remainingGuesses > 0) {
            return b.remainingGuesses - a.remainingGuesses;
        }
        if (a.remainingGuesses === -1 && b.remainingGuesses === 0) return -1;
        if (a.remainingGuesses === 0 && b.remainingGuesses === -1) return 1;
        return 0;
    });
    
    const numToSelect = Math.min(allServersSorted.length, threshold + 2);
    const selectedServers = allServersSorted.slice(0, numToSelect);
    
    console.log(`OpenADP: Selected ${selectedServers.length} servers (last resort - may include exhausted servers):`);
    selectedServers.forEach((server, i) => {
        let guessesStr;
        if (server.remainingGuesses === -1) guessesStr = "unknown";
        else if (server.remainingGuesses === 0) guessesStr = "0 (exhausted)";
        else guessesStr = server.remainingGuesses.toString();
        console.log(`  ${i+1}. ${server.url} (${guessesStr} remaining guesses)`);
    });
    
    return selectedServers;
}

// Export for testing (conditional export to avoid production exposure)
if (typeof process !== 'undefined' && process.env.NODE_ENV === 'test') {
    // Only export for testing
    if (typeof module !== 'undefined' && module.exports) {
        module.exports.selectServersByRemainingGuesses = selectServersByRemainingGuesses;
    }
}
