import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const appleId = process.env.APPLE_ID || ''
    const appleSecret = process.env.APPLE_SECRET || ''
    
    // Test if we can make a direct call to Apple's token endpoint
    const tokenUrl = 'https://appleid.apple.com/auth/token'
    
    // Create a test form data (this won't work without a valid code, but we can test the client credentials)
    const formData = new URLSearchParams({
      client_id: appleId,
      client_secret: appleSecret,
      grant_type: 'authorization_code',
      code: 'TEST_CODE' // This will fail, but we'll see the error
    })
    
    let appleResponse = null
    let appleError = null
    
    try {
      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: formData.toString()
      })
      
      const text = await response.text()
      let data = null
      
      try {
        data = JSON.parse(text)
      } catch {
        data = { raw: text }
      }
      
      appleResponse = {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        data: data
      }
    } catch (error) {
      appleError = error instanceof Error ? error.message : 'Unknown error'
    }
    
    // Also check Apple Developer Console requirements
    const requirements = {
      serviceId: appleId,
      expectedDomains: ['evaultapp.com'],
      expectedReturnUrls: [
        'https://evaultapp.com/api/auth/callback/apple'
      ],
      keyRequirements: {
        keyId: '4S892A36WV',
        teamId: 'B2SUY7SU9A',
        algorithm: 'ES256'
      }
    }
    
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      appleConfig: {
        serviceId: appleId,
        secretLength: appleSecret.length,
        secretValid: appleSecret.length === 302
      },
      testResponse: appleResponse,
      testError: appleError,
      requirements,
      instructions: {
        verifyInAppleConsole: [
          '1. Go to https://developer.apple.com/account/resources/identifiers/list/serviceId',
          `2. Click on Service ID: ${appleId}`,
          '3. Verify "Sign In with Apple" is enabled',
          '4. Verify domain: evaultapp.com',
          '5. Verify return URL: https://evaultapp.com/api/auth/callback/apple',
          '6. Check if domain is verified (green checkmark)'
        ],
        checkKey: [
          '1. Go to https://developer.apple.com/account/resources/authkeys/list',
          '2. Verify key 4S892A36WV exists and is active',
          '3. Verify it has "Sign in with Apple" capability',
          '4. If revoked, generate a new key and update APPLE_SECRET'
        ]
      }
    })
  } catch (error) {
    return NextResponse.json({
      error: 'Diagnostic failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 