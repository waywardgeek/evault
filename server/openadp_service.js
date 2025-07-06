#!/usr/bin/env node

// Mock OpenADP Service for eVault Go Server
// This simulates OpenADP functionality for development and testing

import http from 'http';
import url from 'url';
import crypto from 'crypto';

const PORT = process.env.OPENADP_PORT || 3001;

// CORS headers for localhost development
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json'
};

// In-memory storage for mock OpenADP (in production this would be distributed)
const mockStorage = new Map();

// Mock OpenADP registration
async function mockRegister(userID, appID, secret, pin, maxGuesses) {
  console.log(`🔐 Mock OpenADP Registration:`);
  console.log(`   User ID: ${userID}`);
  console.log(`   App ID: ${appID}`);
  console.log(`   Secret Length: ${secret.length} bytes`);
  console.log(`   Max Guesses: ${maxGuesses}`);

  // Create a unique key for this user/app combination
  const storageKey = `${userID}:${appID}`;
  
  // Generate salt for password hashing
  const salt = crypto.randomBytes(16);
  
  // Hash the PIN using PBKDF2 (simulating secure storage)
  const hashedPin = crypto.pbkdf2Sync(pin, salt, 100000, 32, 'sha256');
  
  // Create mock metadata that includes encrypted secret
  const metadata = {
    version: '1.0',
    userID,
    appID,
    salt: Array.from(salt),
    hashedPin: Array.from(hashedPin),
    encryptedSecret: Array.from(secret), // In real OpenADP this would be properly encrypted
    maxGuesses,
    remainingGuesses: maxGuesses,
    created: Date.now()
  };
  
  // Store in mock distributed storage
  mockStorage.set(storageKey, metadata);
  
  // Return encoded metadata (simulating what OpenADP would return)
  const metadataBytes = new TextEncoder().encode(JSON.stringify(metadata));
  
  console.log(`✅ Mock OpenADP registration successful`);
  console.log(`   Metadata size: ${metadataBytes.length} bytes`);
  
  return metadataBytes;
}

// Mock OpenADP recovery
async function mockRecover(metadataBytes, pin) {
  console.log(`🔓 Mock OpenADP Recovery:`);
  console.log(`   Metadata size: ${metadataBytes.length} bytes`);
  
  // Decode metadata
  const metadataString = new TextDecoder().decode(metadataBytes);
  const metadata = JSON.parse(metadataString);
  
  const storageKey = `${metadata.userID}:${metadata.appID}`;
  
  // Get current state from storage
  const currentMetadata = mockStorage.get(storageKey);
  if (!currentMetadata) {
    throw new Error('Metadata not found in distributed storage');
  }
  
  // Check if locked out
  if (currentMetadata.remainingGuesses <= 0) {
    throw new Error('Too many failed attempts - account locked');
  }
  
  // Verify PIN
  const salt = new Uint8Array(currentMetadata.salt);
  const expectedHash = new Uint8Array(currentMetadata.hashedPin);
  const providedHash = crypto.pbkdf2Sync(pin, salt, 100000, 32, 'sha256');
  
  if (!crypto.timingSafeEqual(expectedHash, providedHash)) {
    // Wrong PIN - decrement remaining guesses
    currentMetadata.remainingGuesses--;
    mockStorage.set(storageKey, currentMetadata);
    
    throw new Error(`Invalid PIN. ${currentMetadata.remainingGuesses} attempts remaining`);
  }
  
  // PIN is correct - reset guesses and return secret
  currentMetadata.remainingGuesses = currentMetadata.maxGuesses;
  mockStorage.set(storageKey, currentMetadata);
  
  const secret = new Uint8Array(currentMetadata.encryptedSecret);
  
  console.log(`✅ Mock OpenADP recovery successful`);
  console.log(`   Secret size: ${secret.length} bytes`);
  console.log(`   Remaining attempts: ${currentMetadata.remainingGuesses}`);
  
  // Simulate metadata refresh (10% chance)
  let updatedMetadata = null;
  if (Math.random() < 0.1) {
    currentMetadata.refreshed = Date.now();
    updatedMetadata = new TextEncoder().encode(JSON.stringify(currentMetadata));
    console.log(`📝 Mock backup refresh simulation`);
  }
  
  return {
    secret,
    remaining: currentMetadata.remainingGuesses,
    updatedMetadata
  };
}

// Handle OpenADP registration
async function handleRegister(req, res) {
  try {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', async () => {
      const { userID, appID, secret, pin, maxGuesses, serversUrl } = JSON.parse(body);
      
      // Convert array back to Uint8Array
      const secretBytes = new Uint8Array(secret);
      
      // Call mock OpenADP registration
      const metadata = await mockRegister(userID, appID, secretBytes, pin, maxGuesses);
      
      res.writeHead(200, corsHeaders);
      res.end(JSON.stringify({
        success: true,
        metadata: Array.from(metadata)
      }));
    });
  } catch (error) {
    console.error('❌ Mock OpenADP registration failed:', error.message);
    res.writeHead(500, corsHeaders);
    res.end(JSON.stringify({
      success: false,
      error: error.message
    }));
  }
}

// Handle OpenADP recovery
async function handleRecover(req, res) {
  try {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', async () => {
      const { metadata, pin, serversUrl } = JSON.parse(body);
      
      // Convert array back to Uint8Array
      const metadataBytes = new Uint8Array(metadata);
      
      // Call mock OpenADP recovery
      const result = await mockRecover(metadataBytes, pin);
      
      res.writeHead(200, corsHeaders);
      res.end(JSON.stringify({
        success: true,
        secret: Array.from(result.secret),
        remaining: result.remaining,
        updatedMetadata: result.updatedMetadata ? Array.from(result.updatedMetadata) : null
      }));
    });
  } catch (error) {
    console.error('❌ Mock OpenADP recovery failed:', error.message);
    res.writeHead(500, corsHeaders);
    res.end(JSON.stringify({
      success: false,
      error: error.message
    }));
  }
}

// Handle health check
function handleHealth(req, res) {
  res.writeHead(200, corsHeaders);
  res.end(JSON.stringify({
    success: true,
    service: 'Mock OpenADP Service',
    status: 'healthy',
    mode: 'development',
    storage_entries: mockStorage.size,
    timestamp: new Date().toISOString()
  }));
}

// Create HTTP server
const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const path = parsedUrl.pathname;
  const method = req.method;
  
  console.log(`${method} ${path}`);
  
  // Handle CORS preflight
  if (method === 'OPTIONS') {
    res.writeHead(200, corsHeaders);
    res.end();
    return;
  }
  
  // Route requests
  if (path === '/health' && method === 'GET') {
    handleHealth(req, res);
  } else if (path === '/register' && method === 'POST') {
    await handleRegister(req, res);
  } else if (path === '/recover' && method === 'POST') {
    await handleRecover(req, res);
  } else {
    res.writeHead(404, corsHeaders);
    res.end(JSON.stringify({
      success: false,
      error: 'Not found'
    }));
  }
});

// Start server
server.listen(PORT, () => {
  console.log(`🚀 Mock OpenADP Service running on port ${PORT}`);
  console.log(`📡 Endpoints:`);
  console.log(`   GET  /health   - Health check`);
  console.log(`   POST /register - Register secret with mock OpenADP`);
  console.log(`   POST /recover  - Recover secret from mock OpenADP`);
  console.log(`⚠️  NOTE: This is a MOCK service for development`);
  console.log(`⚠️  Replace with real OpenADP integration for production`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Received SIGTERM, shutting down gracefully...');
  server.close(() => {
    console.log('✅ Mock OpenADP Service stopped');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 Received SIGINT, shutting down gracefully...');
  server.close(() => {
    console.log('✅ Mock OpenADP Service stopped');
    process.exit(0);
  });
}); 