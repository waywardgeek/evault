import { NextRequest, NextResponse } from 'next/server'

// In-memory storage for OAuth logs (persists per serverless instance)
const oauthLogs: any[] = []
const MAX_LOGS = 100

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const logEntry = {
      ...body,
      timestamp: new Date().toISOString(),
      serverInstance: process.env.VERCEL_REGION || 'unknown'
    }
    
    // Add to beginning of array
    oauthLogs.unshift(logEntry)
    
    // Keep only last MAX_LOGS entries
    if (oauthLogs.length > MAX_LOGS) {
      oauthLogs.length = MAX_LOGS
    }
    
    return NextResponse.json({ status: 'logged', count: oauthLogs.length })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to log' }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    logs: oauthLogs,
    count: oauthLogs.length,
    timestamp: new Date().toISOString()
  })
} 