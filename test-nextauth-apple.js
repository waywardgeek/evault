// Test what NextAuth expects for Apple provider

const jwt = require('jsonwebtoken');
const fs = require('fs');

console.log('🍎 Testing Apple Sign In Secret Formats\n');

// Our current JWT
const currentJWT = 'eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6IjRTODkyQTM2V1YifQ.eyJpYXQiOjE3NTIyNDQ3NjksImV4cCI6MTc4MzgwMjM2OSwiYXVkIjoiaHR0cHM6Ly9hcHBsZWlkLmFwcGxlLmNvbSIsImlzcyI6IkIyU1VZN1NVOUEiLCJzdWIiOiJjb20uZXZhdWx0YXBwLndlYiJ9.DPboQsqjqyPgE4HqOfiM-F1SmO5h7Pzpal_n0mPxmXQRBI-9HIog2uC2PjJy-HtMWguspACZaRQbtY9WpcEKMw';

console.log('1️⃣ Current JWT Analysis:');
console.log(`   Length: ${currentJWT.length} characters`);

try {
  const decoded = jwt.decode(currentJWT, { complete: true });
  console.log('   Decoded successfully:', JSON.stringify(decoded, null, 2));
} catch (e) {
  console.log('   ❌ Failed to decode:', e.message);
}

console.log('\n2️⃣ NextAuth Apple Provider Expectations:');
console.log('   NextAuth v4 might expect one of these formats:');
console.log('   a) Pre-generated JWT (what we have)');
console.log('   b) Raw .p8 private key content');
console.log('   c) Path to .p8 file');

console.log('\n3️⃣ Checking Private Key:');
if (fs.existsSync('AuthKey_4S892A36WV.p8')) {
  const keyContent = fs.readFileSync('AuthKey_4S892A36WV.p8', 'utf8');
  console.log('   ✅ Private key file found');
  console.log(`   Key starts with: ${keyContent.substring(0, 30)}...`);
  console.log(`   Key length: ${keyContent.length} characters`);
  
  console.log('\n4️⃣ Testing JWT Generation from Private Key:');
  try {
    const newJWT = jwt.sign(
      {
        iss: 'B2SUY7SU9A',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (86400 * 180), // 6 months
        aud: 'https://appleid.apple.com',
        sub: 'com.evaultapp.web'
      },
      keyContent,
      {
        algorithm: 'ES256',
        keyid: '4S892A36WV'
      }
    );
    console.log('   ✅ Generated new JWT successfully');
    console.log(`   New JWT length: ${newJWT.length}`);
    console.log(`   Matches current JWT: ${newJWT === currentJWT}`);
  } catch (e) {
    console.log('   ❌ Failed to generate JWT:', e.message);
  }
} else {
  console.log('   ❌ Private key file not found');
}

console.log('\n💡 Recommendation:');
console.log('   If NextAuth expects the raw private key, try setting:');
console.log('   APPLE_SECRET=<contents of AuthKey_4S892A36WV.p8>');
console.log('   Instead of the pre-generated JWT'); 