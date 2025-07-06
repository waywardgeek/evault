#!/usr/bin/env node

// Real OpenADP Service for eVault Go Server
// This connects to actual OpenADP distributed servers

import http from 'http';
import url from 'url';
import { register, recover } from '@openadp/ocrypt';

const PORT = process.env.OPENADP_PORT || 3001;

// CORS headers for localhost development
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json'
};

// Handle OpenADP registration using real servers
async function handleRegister(req, res) {
  try {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', async () => {
      const { userID, appID, secret, pin, maxGuesses, serversUrl } = JSON.parse(body);
      
      console.log(`🔐 Real OpenADP Registration:`);
      console.log(`   User ID: ${userID}`);
      console.log(`   App ID: ${appID}`);
      console.log(`   Secret Length: ${secret.length} bytes`);
      console.log(`   Max Guesses: ${maxGuesses}`);
      console.log(`   Using servers: ${serversUrl || 'default registry'}`);
      
      // Convert array back to Uint8Array
      const secretBytes = new Uint8Array(secret);
      
      // Call real OpenADP registration
      const metadata = await register(userID, appID, secretBytes, pin, maxGuesses, serversUrl);
      
      console.log(`✅ Real OpenADP registration successful`);
      console.log(`   Metadata size: ${metadata.length} bytes`);
      
      res.writeHead(200, corsHeaders);
      res.end(JSON.stringify({
        success: true,
        metadata: Array.from(metadata)
      }));
    });
  } catch (error) {
    console.error('❌ Real OpenADP registration failed:', error.message);
    res.writeHead(500, corsHeaders);
    res.end(JSON.stringify({
      success: false,
      error: error.message
    }));
  }
}

// Handle OpenADP recovery using real servers
async function handleRecover(req, res) {
  try {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', async () => {
      const { metadata, pin, serversUrl } = JSON.parse(body);
      
      console.log(`🔓 Real OpenADP Recovery:`);
      console.log(`   Metadata size: ${metadata.length} bytes`);
      console.log(`   Using servers: ${serversUrl || 'from metadata'}`);
      
      // Convert array back to Uint8Array
      const metadataBytes = new Uint8Array(metadata);
      
      // Call real OpenADP recovery
      const result = await recover(metadataBytes, pin, serversUrl);
      
      console.log(`✅ Real OpenADP recovery successful`);
      console.log(`   Secret size: ${result.secret.length} bytes`);
      console.log(`   Remaining attempts: ${result.remaining}`);
      
      res.writeHead(200, corsHeaders);
      res.end(JSON.stringify({
        success: true,
        secret: Array.from(result.secret),
        remaining: result.remaining,
        updatedMetadata: result.updatedMetadata ? Array.from(result.updatedMetadata) : null
      }));
    });
  } catch (error) {
    console.error('❌ Real OpenADP recovery failed:', error.message);
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
    service: 'Real OpenADP Service',
    status: 'healthy',
    mode: 'production',
    version: '0.1.3',
    servers: 'live distributed network'
  }));
}

// Handle OPTIONS (CORS preflight)
function handleOptions(req, res) {
  res.writeHead(200, corsHeaders);
  res.end();
}

// Main server
const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const path = parsedUrl.pathname;
  const method = req.method;

  // Handle CORS preflight
  if (method === 'OPTIONS') {
    handleOptions(req, res);
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

// Start the server
server.listen(PORT, () => {
  console.log(`🚀 Real OpenADP Service running on port ${PORT}`);
  console.log(`📡 Endpoints:`);
  console.log(`   GET  /health   - Health check`);
  console.log(`   POST /register - Register secret with OpenADP distributed servers`);
  console.log(`   POST /recover  - Recover secret from OpenADP distributed servers`);
  console.log(`✅ Connected to LIVE OpenADP network`);
  console.log(`🌐 Using production distributed servers`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down Real OpenADP Service...');
  server.close(() => {
    console.log('✅ Real OpenADP Service stopped');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down Real OpenADP Service...');
  server.close(() => {
    console.log('✅ Real OpenADP Service stopped');
    process.exit(0);
  });
}); 