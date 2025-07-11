import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json()
    
    if (!code) {
      return NextResponse.json({ error: 'No code provided' }, { status: 400 })
    }
    
    const clientId = process.env.APPLE_ID || ''
    const clientSecret = process.env.APPLE_SECRET || ''
    const redirectUri = 'https://evaultapp.com/api/auth/callback/apple'
    
    // Prepare the token exchange request exactly as NextAuth would
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: redirectUri,
      client_id: clientId,
      client_secret: clientSecret
    })
    
    console.log('🔄 Token Exchange Request:', {
      url: 'https://appleid.apple.com/auth/token',
      clientId,
      redirectUri,
      codeLength: code.length,
      secretLength: clientSecret.length
    })
    
    // Make the token exchange request
    const response = await fetch('https://appleid.apple.com/auth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    })
    
    const responseText = await response.text()
    let responseData
    
    try {
      responseData = JSON.parse(responseText)
    } catch {
      responseData = { raw: responseText }
    }
    
    return NextResponse.json({
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      data: responseData,
      request: {
        clientId,
        redirectUri,
        codeProvided: code,
        paramsString: params.toString()
      }
    })
  } catch (error) {
    return NextResponse.json({
      error: 'Test failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 