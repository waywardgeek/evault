import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger';

export function middleware(request: NextRequest) {
  // Handle authenticated user redirect from home page
  if (request.nextUrl.pathname === '/') {
    const sessionToken = request.cookies.get('next-auth.session-token') || 
                         request.cookies.get('__Secure-next-auth.session-token');
    
    if (sessionToken) {
      // User is authenticated, redirect to vault
      return NextResponse.redirect(new URL('/vault', request.url));
    }
  }
  // Log Apple OAuth callback data
  if (request.nextUrl.pathname === '/api/auth/callback/apple' && request.method === 'POST') {
    logger.debug('🍎 Apple OAuth Callback Intercepted:', {
      method: request.method,
      url: request.url,
      contentLength: request.headers.get('content-length'),
      contentType: request.headers.get('content-type'),
      origin: request.headers.get('origin'),
      userAgent: request.headers.get('user-agent'),
      timestamp: new Date().toISOString(),
      allHeaders: Object.fromEntries(request.headers.entries())
    });

    // Try to read the body (this might not work due to streaming, but worth trying)
    request.clone().text().then(body => {
      logger.debug('🍎 Apple OAuth Callback Body:', {
        bodyLength: body.length,
        bodyContent: body,
        parsedForm: new URLSearchParams(body),
        timestamp: new Date().toISOString()
      });
      
      // Log to our custom endpoint
      const formData = new URLSearchParams(body);
      fetch('https://evaultapp.com/api/oauth-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'apple_callback_received',
          hasCode: formData.has('code'),
          hasState: formData.has('state'),
          hasError: formData.has('error'),
          hasIdToken: formData.has('id_token'),
          error: formData.get('error'),
          errorDescription: formData.get('error_description'),
          formKeys: Array.from(formData.keys()),
          headers: Object.fromEntries(request.headers.entries())
        })
      }).catch(err => {
        logger.debug('🍎 Could not log to endpoint:', err.message);
      });
    }).catch(err => {
      logger.debug('🍎 Could not read body:', err.message);
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/api/auth/callback/apple']
} 