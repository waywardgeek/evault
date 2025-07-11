import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const formData = new URLSearchParams(body)
    
    const debugData = {
      timestamp: new Date().toISOString(),
      method: request.method,
      url: request.url,
      headers: Object.fromEntries(request.headers.entries()),
      bodyLength: body.length,
      formDataEntries: Object.fromEntries(formData.entries()),
      hasCode: formData.has('code'),
      hasState: formData.has('state'),
      hasError: formData.has('error'),
      hasIdToken: formData.has('id_token'),
      errorType: formData.get('error'),
      errorDescription: formData.get('error_description')
    }

    console.log('🍎 Apple OAuth Debug Data:', debugData)
    
    return NextResponse.json({
      message: 'Debug data logged',
      ...debugData
    })
  } catch (error) {
    console.error('❌ Debug endpoint error:', error)
    return NextResponse.json({ error: 'Failed to process debug data' }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ 
    message: 'Apple OAuth Debug Endpoint',
    usage: 'This endpoint logs Apple OAuth callback data for debugging'
  })
} 