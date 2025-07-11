import { NextResponse } from 'next/server'
import { SignJWT, importPKCS8 } from 'jose'

export async function GET() {
  try {
    const privateKey = process.env.APPLE_SECRET || ''
    const teamId = process.env.APPLE_TEAM_ID || 'B2SUY7SU9A'
    const keyId = process.env.APPLE_KEY_ID || '4S892A36WV'
    const clientId = process.env.APPLE_ID || 'com.evaultapp.web'
    
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
    
    // Import the private key
    const privateKeyObj = await importPKCS8(formattedKey, 'ES256')
    
    // Create and sign the JWT
    const jwt = await new SignJWT({
      sub: clientId,
    })
      .setProtectedHeader({ alg: 'ES256', kid: keyId })
      .setIssuedAt()
      .setIssuer(teamId)
      .setAudience('https://appleid.apple.com')
      .setExpirationTime('180d')
      .sign(privateKeyObj)
    
    // Decode the JWT to show its contents
    const [header, payload] = jwt.split('.').slice(0, 2).map(part => 
      JSON.parse(Buffer.from(part, 'base64url').toString())
    )
    
    return NextResponse.json({
      success: true,
      jwt: jwt,
      jwtLength: jwt.length,
      decoded: {
        header,
        payload
      },
      message: 'Successfully generated Apple JWT. Use this as APPLE_SECRET in environment variables.'
    })
  } catch (error: any) {
    return NextResponse.json({ 
      error: 'Failed to generate Apple JWT',
      details: error.message,
      stack: error.stack
    }, { status: 500 })
  }
} 