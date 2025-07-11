// WORKAROUND: Set NEXTAUTH_URL dynamically if not already set
if (!process.env.NEXTAUTH_URL) {
  // In production, use the custom domain
  if (process.env.NODE_ENV === 'production' && process.env.VERCEL_ENV === 'production') {
    // Use VERCEL_PROJECT_PRODUCTION_URL if available
    if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
      process.env.NEXTAUTH_URL = `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    } else {
      // Fallback to hardcoded custom domain
      process.env.NEXTAUTH_URL = 'https://evaultapp.com'
    }
  } else if (process.env.VERCEL_URL) {
    // For preview deployments
    process.env.NEXTAUTH_URL = `https://${process.env.VERCEL_URL}`
  }
  
  console.log('🔧 Dynamically set NEXTAUTH_URL to:', process.env.NEXTAUTH_URL)
}

import NextAuth from 'next-auth'
import { authOptions } from '@/lib/auth'
import { NextRequest } from 'next/server'

// Wrap the handler to add debugging for Apple OAuth
async function debugHandler(req: NextRequest, context: any) {
  // Intercept Apple OAuth callbacks for debugging
  if (req.method === 'POST' && req.url?.includes('/api/auth/callback/apple')) {
    console.log('🍎 Apple OAuth Callback Intercepted:', {
      method: req.method,
      url: req.url,
      contentLength: req.headers.get('content-length'),
      contentType: req.headers.get('content-type'),
      origin: req.headers.get('origin'),
      userAgent: req.headers.get('user-agent'),
      timestamp: new Date().toISOString()
    });
    
    // Check cookies
    const cookieHeader = req.headers.get('cookie');
    console.log('🍪 Cookies present:', {
      hasCookies: !!cookieHeader,
      cookieCount: cookieHeader ? cookieHeader.split(';').length : 0,
      hasStateCookie: cookieHeader ? cookieHeader.includes('next-auth.state') : false,
      hasPKCECookie: cookieHeader ? cookieHeader.includes('next-auth.pkce') : false,
      hasCSRFCookie: cookieHeader ? cookieHeader.includes('next-auth.csrf-token') : false,
      cookies: cookieHeader ? cookieHeader.split(';').map(c => c.trim().split('=')[0]) : []
    });
    
    // Clone the request to read the body
    const clonedReq = req.clone();
    try {
      const body = await clonedReq.text();
      const params = new URLSearchParams(body);
      console.log('🍎 Apple OAuth Callback Body:', {
        bodyLength: body.length,
        hasState: params.has('state'),
        stateValue: params.get('state')?.substring(0, 20) + '...',
        hasCode: params.has('code'),
        hasUser: params.has('user'),
        timestamp: new Date().toISOString()
      });
    } catch (e) {
      console.error('Failed to read Apple callback body:', e);
    }
  }
  
  // Call the original NextAuth handler
  const handler = NextAuth(authOptions);
  return handler(req, context);
}

export { debugHandler as GET, debugHandler as POST } 