import { NextResponse } from 'next/server'

export async function GET() {
  const envCheck = {
    hasAppleId: !!process.env.APPLE_ID,
    hasAppleSecret: !!process.env.APPLE_SECRET,
    hasNextAuthUrl: !!process.env.NEXTAUTH_URL,
    hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
    appleIdValue: process.env.APPLE_ID || 'NOT_SET',
    appleSecretLength: process.env.APPLE_SECRET?.length || 0,
    nextAuthUrl: process.env.NEXTAUTH_URL || 'NOT_SET',
    timestamp: new Date().toISOString()
  }

  return NextResponse.json(envCheck, {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache'
    }
  })
} 