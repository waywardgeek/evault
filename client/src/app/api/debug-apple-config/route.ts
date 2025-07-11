import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const appleId = process.env.APPLE_ID || 'NOT_SET'
    const appleSecret = process.env.APPLE_SECRET || ''
    
    let jwtDecoded = null
    let jwtError = null
    let rawPayloadBase64 = ''
    let rawPayloadString = ''
    
    if (appleSecret) {
      try {
        // Manually decode the JWT parts
        const parts = appleSecret.split('.')
        if (parts.length === 3) {
          rawPayloadBase64 = parts[1]
          // Try to decode the base64 payload
          try {
            rawPayloadString = Buffer.from(rawPayloadBase64, 'base64url').toString()
            // Attempt to parse as JSON
            const payload = JSON.parse(rawPayloadString)
            jwtDecoded = {
              header: JSON.parse(Buffer.from(parts[0], 'base64url').toString()),
              payload: payload,
              signature: parts[2]
            }
          } catch (e) {
            jwtError = `Payload decode error: ${e instanceof Error ? e.message : 'Unknown'}`
            // Log the raw string to see what's wrong
            console.log('Raw payload string:', rawPayloadString)
          }
        }
      } catch (e) {
        jwtError = e instanceof Error ? e.message : 'Unknown JWT error'
      }
    }
    
    // Get current timestamp for comparison
    const now = Math.floor(Date.now() / 1000)
    
    return NextResponse.json({
      appleConfig: {
        appleId,
        hasSecret: !!appleSecret,
        secretLength: appleSecret.length,
      },
      jwtAnalysis: {
        decoded: jwtDecoded,
        error: jwtError,
        rawPayloadBase64: rawPayloadBase64.substring(0, 50) + '...',
        rawPayloadString: rawPayloadString.substring(0, 100) + '...',
        currentTime: now,
        isExpired: jwtDecoded?.payload?.exp ? jwtDecoded.payload.exp < now : null,
        expiresIn: jwtDecoded?.payload?.exp ? jwtDecoded.payload.exp - now : null,
      },
      urls: {
        nextAuthUrl: process.env.NEXTAUTH_URL || 'NOT_SET',
        redirectUri: 'https://evaultapp.com/api/auth/callback/apple',
        expectedReturnUrl: 'https://evaultapp.com/api/auth/callback/apple'
      },
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to analyze Apple configuration',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 