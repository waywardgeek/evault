import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  // Redirect directly to NextAuth Google sign-in with callback to test-auth
  const signInUrl = new URL('/api/auth/signin/google', request.url)
  signInUrl.searchParams.set('callbackUrl', '/test-auth')
  
  return NextResponse.redirect(signInUrl)
} 