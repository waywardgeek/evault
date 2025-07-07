#!/usr/bin/env node

const jwt = require('jsonwebtoken');

// Generate a valid JWT token for testing
// This uses the same secret as the server's default
const token = jwt.sign(
    { 
        user_id: 'test-user-123',
        email: 'test@example.com'
    },
    'your-secret-key-change-this-in-production',
    { 
        expiresIn: '1h',
        issuer: 'evault-server'
    }
);

console.log(token); 