import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const appleSecret = process.env.APPLE_SECRET;
    const appleId = process.env.APPLE_ID;
    
    if (!appleSecret || !appleId) {
      return NextResponse.json({
        error: 'Missing Apple credentials',
        hasAppleId: !!appleId,
        hasAppleSecret: !!appleSecret
      }, { status: 400 });
    }

    // Basic JWT format validation
    const jwtParts = appleSecret.split('.');
    const isValidJwtFormat = jwtParts.length === 3;
    
    let headerData = null;
    let payloadData = null;
    let parseError = null;

    try {
      // Decode JWT header and payload (without verification)
      headerData = JSON.parse(Buffer.from(jwtParts[0], 'base64url').toString());
      payloadData = JSON.parse(Buffer.from(jwtParts[1], 'base64url').toString());
    } catch (e) {
      parseError = e instanceof Error ? e.message : 'Unknown parse error';
    }

    const now = Math.floor(Date.now() / 1000);
    const isExpired = payloadData?.exp && payloadData.exp < now;

    return NextResponse.json({
      jwtValidation: {
        hasCorrectFormat: isValidJwtFormat,
        parts: jwtParts.length,
        parseError,
        header: headerData,
        payload: payloadData,
        isExpired,
        currentTime: now,
        expiresAt: payloadData?.exp,
        algorithm: headerData?.alg,
        keyId: headerData?.kid,
        issuer: payloadData?.iss,
        subject: payloadData?.sub,
        audience: payloadData?.aud
      },
      environment: {
        appleId,
        appleSecretLength: appleSecret.length,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    return NextResponse.json({
      error: 'JWT validation failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 