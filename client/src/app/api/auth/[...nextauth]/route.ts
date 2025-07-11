import { NextRequest, NextResponse } from 'next/server'
import NextAuth from 'next-auth'
import { authOptions } from '@/lib/auth'

// Temporary debug handler for Apple callback
async function debugAppleCallback(request: NextRequest) {
  try {
    const body = await request.text()
    const formData = new URLSearchParams(body)
    
    const debugData = {
      timestamp: new Date().toISOString(),
      method: request.method,
      url: request.url,
      headers: Object.fromEntries(request.headers.entries()),
      bodyLength: body.length,
      rawBody: body,
      formDataEntries: Object.fromEntries(formData.entries()),
      hasCode: formData.has('code'),
      hasState: formData.has('state'),
      hasError: formData.has('error'),
      hasIdToken: formData.has('id_token'),
      errorType: formData.get('error'),
      errorDescription: formData.get('error_description'),
      code: formData.get('code'),
      state: formData.get('state')
    }

    console.log('🍎 Apple OAuth Debug Data:', debugData)
    
    return NextResponse.json({
      message: 'Apple OAuth Debug Data Captured',
      ...debugData
    })
  } catch (error) {
    console.error('❌ Debug handler error:', error)
    return NextResponse.json({ 
      error: 'Failed to process debug data',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Check if this is an Apple callback POST request
async function handleRequest(request: NextRequest) {
  const url = new URL(request.url)
  
  // Temporary debug mode for Apple callback
  if (url.pathname === '/api/auth/callback/apple' && request.method === 'POST') {
    return debugAppleCallback(request)
  }
  
  // For all other requests, use normal NextAuth
  const handler = NextAuth(authOptions)
  return handler(request)
}

export { handleRequest as GET, handleRequest as POST } 