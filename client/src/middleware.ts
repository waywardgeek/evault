import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  // Log Apple OAuth callback data
  if (request.nextUrl.pathname === '/api/auth/callback/apple' && request.method === 'POST') {
    console.log('🍎 Apple OAuth Callback Intercepted:', {
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
      console.log('🍎 Apple OAuth Callback Body:', {
        bodyLength: body.length,
        bodyContent: body,
        parsedForm: new URLSearchParams(body),
        timestamp: new Date().toISOString()
      });
    }).catch(err => {
      console.log('🍎 Could not read body:', err.message);
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/api/auth/callback/apple'
} 