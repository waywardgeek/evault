import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  const cookieStore = cookies()
  
  const authCookies = {
    sessionToken: cookieStore.get('next-auth.session-token')?.value,
    callbackUrl: cookieStore.get('next-auth.callback-url')?.value,
    csrfToken: cookieStore.get('next-auth.csrf-token')?.value,
  }
  
  return NextResponse.json({
    hasSession: !!session,
    session,
    cookies: authCookies,
    env: {
      NEXTAUTH_URL: process.env.NEXTAUTH_URL,
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? 'SET' : 'NOT SET',
      NODE_ENV: process.env.NODE_ENV,
    }
  })
} 