#!/usr/bin/env npx tsx

/**
 * Test script for API routes
 * Run with: npx tsx test-api-routes.ts
 */

const API_BASE = 'http://localhost:3000/api'

// Test user data
const testUser = {
  email: 'test@example.com',
  provider: 'google',
  user: {
    id: 'google-123',
    email: 'test@example.com',
    name: 'Test User',
    image: 'https://example.com/avatar.jpg'
  }
}

async function testEndpoint(
  method: string,
  path: string,
  body?: any,
  token?: string
) {
  const headers: any = {
    'Content-Type': 'application/json',
  }
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  try {
    const response = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    })

    const data = await response.json()
    
    console.log(`${method} ${path}:`, response.status)
    if (response.ok) {
      console.log('✅ Success:', data)
    } else {
      console.log('❌ Error:', data)
    }
    console.log('---')
    
    return { status: response.status, data }
  } catch (error) {
    console.log(`${method} ${path}: ❌ Failed`)
    console.log('Error:', error)
    console.log('---')
    return { status: 500, error }
  }
}

async function runTests() {
  console.log('🧪 Testing eVault API Routes...\n')

  // Test 1: Stats (public endpoint)
  console.log('1️⃣ Testing public stats endpoint...')
  await testEndpoint('GET', '/stats')

  // Test 2: Auth callback
  console.log('2️⃣ Testing auth callback...')
  const authResult = await testEndpoint('POST', '/auth/callback', testUser)
  const token = authResult.data?.token

  if (!token) {
    console.log('❌ No token received, cannot test protected endpoints')
    return
  }

  console.log(`🔑 Got token: ${token.substring(0, 20)}...`)
  console.log()

  // Test 3: Get current user
  console.log('3️⃣ Testing get current user...')
  await testEndpoint('GET', '/user', undefined, token)

  // Test 4: Get user info
  console.log('4️⃣ Testing get user info...')
  await testEndpoint('GET', '/user/info', undefined, token)

  // Test 5: Refresh token
  console.log('5️⃣ Testing refresh token...')
  await testEndpoint('POST', '/user/refresh', undefined, token)

  // Test 6: Update email
  console.log('6️⃣ Testing update email...')
  await testEndpoint('POST', '/user/update-email', {
    email: 'newemail@example.com'
  }, token)

  // Test 7: Vault status
  console.log('7️⃣ Testing vault status...')
  await testEndpoint('GET', '/vault/status', undefined, token)

  // Test 8: Register vault
  console.log('8️⃣ Testing vault registration...')
  await testEndpoint('POST', '/vault/register', {
    pin: '1234',
    openadp_metadata: 'mock-metadata-base64'
  }, token)

  // Test 9: List entries
  console.log('9️⃣ Testing list entries...')
  await testEndpoint('GET', '/entries/list', undefined, token)

  // Test 10: Add entry
  console.log('🔟 Testing add entry...')
  await testEndpoint('POST', '/entries', {
    name: 'test-entry',
    hpke_blob: Buffer.from('encrypted-data').toString('base64'),
    deletion_hash: Buffer.from('deletion-hash').toString('base64')
  }, token)

  console.log('\n✅ All tests completed!')
}

// Run tests
runTests().catch(console.error) 