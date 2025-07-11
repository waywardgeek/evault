import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const formData = new URLSearchParams(body)
    
    console.log('🍎 Raw Apple Callback Data:', {
      timestamp: new Date().toISOString(),
      bodyLength: body.length,
      rawBody: body,
      parsedData: Object.fromEntries(formData.entries()),
      hasError: formData.has('error'),
      hasCode: formData.has('code'),
      hasState: formData.has('state'),
      error: formData.get('error'),
      errorDescription: formData.get('error_description')
    })
    
    return NextResponse.json({ status: 'logged', timestamp: new Date().toISOString() })
  } catch (error) {
    console.error('❌ Test callback error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ message: 'Test Apple callback endpoint' })
} 