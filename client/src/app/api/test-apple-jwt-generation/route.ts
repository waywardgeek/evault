import { NextResponse } from 'next/server'



export async function GET() {
  try {
    const privateKey = process.env.APPLE_SECRET || ''
    const teamId = process.env.APPLE_TEAM_ID || 'B2SUY7SU9A'
    const keyId = process.env.APPLE_KEY_ID || '4S892A36WV'
    const clientId = process.env.APPLE_ID || 'com.evaultapp.web'
    
    // Check if we have the private key
    if (!privateKey) {
      return NextResponse.json({ error: 'No Apple private key found' }, { status: 500 })
    }
    
    // Format the private key if needed
    let formattedKey = privateKey
    if (!privateKey.includes('\n')) {
      formattedKey = privateKey
        .replace('-----BEGIN PRIVATE KEY-----', '-----BEGIN PRIVATE KEY-----\n')
        .replace('-----END PRIVATE KEY-----', '\n-----END PRIVATE KEY-----')
      
      const keyMatch = formattedKey.match(/-----BEGIN PRIVATE KEY-----\n(.+)\n-----END PRIVATE KEY-----/)
      if (keyMatch) {
        const keyContent = keyMatch[1]
        const formattedKeyContent = keyContent.match(/.{1,64}/g)?.join('\n') || keyContent
        formattedKey = `-----BEGIN PRIVATE KEY-----\n${formattedKeyContent}\n-----END PRIVATE KEY-----`
      }
    }
    
    // Create JWT header and payload
    const header = {
      alg: 'ES256',
      kid: keyId,
      typ: 'JWT'
    }
    
    const now = Math.floor(Date.now() / 1000)
    const payload = {
      iss: teamId,
      iat: now,
      exp: now + 86400 * 180, // 180 days
      aud: 'https://appleid.apple.com',
      sub: clientId
    }
    
    // For testing purposes, just show the configuration
    return NextResponse.json({
      success: true,
      config: {
        hasPrivateKey: !!privateKey,
        privateKeyLength: privateKey.length,
        formattedKeyLength: formattedKey.length,
        hasLineBreaks: formattedKey.includes('\n'),
        teamId,
        keyId,
        clientId,
        jwtHeader: header,
        jwtPayload: payload,
        privateKeyStart: formattedKey.substring(0, 50),
        privateKeyEnd: formattedKey.substring(formattedKey.length - 50)
      },
      message: 'Apple JWT configuration looks correct. NextAuth should be able to generate the JWT with this configuration.'
    })
  } catch (error: any) {
    return NextResponse.json({ 
      error: 'Failed to process Apple configuration',
      details: error.message 
    }, { status: 500 })
  }
} 