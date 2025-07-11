import { NextResponse } from 'next/server'

export async function GET() {
  // Get base URL for NextAuth
  const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http'
  const vercelUrl = process.env.VERCEL_URL
  const nextAuthUrl = process.env.NEXTAUTH_URL
  
  // Determine what URL NextAuth would use
  let effectiveUrl = nextAuthUrl || (vercelUrl ? `${protocol}://${vercelUrl}` : null)
  
  const envCheck = {
    // NextAuth variables
    hasAppleId: !!process.env.APPLE_ID,
    hasAppleSecret: !!process.env.APPLE_SECRET,
    hasNextAuthUrl: !!process.env.NEXTAUTH_URL,
    hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
    appleIdValue: process.env.APPLE_ID || 'NOT_SET',
    appleSecretLength: process.env.APPLE_SECRET?.length || 0,
    nextAuthUrl: process.env.NEXTAUTH_URL || 'NOT_SET',
    
    // Vercel system variables
    vercelEnv: process.env.VERCEL_ENV || 'NOT_SET',
    vercelUrl: process.env.VERCEL_URL || 'NOT_SET',
    vercelProjectProductionUrl: process.env.VERCEL_PROJECT_PRODUCTION_URL || 'NOT_SET',
    nodeEnv: process.env.NODE_ENV || 'NOT_SET',
    
    // Computed values
    effectiveUrl: effectiveUrl || 'COULD_NOT_DETERMINE',
    isProduction: process.env.NODE_ENV === 'production',
    
    // All NEXT_ prefixed vars
    nextPublicApiUrl: process.env.NEXT_PUBLIC_API_URL || 'NOT_SET',
    
    timestamp: new Date().toISOString()
  }

  return NextResponse.json(envCheck, {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache'
    }
  })
} 