import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // Return basic API status information
    return NextResponse.json({
      status: 'healthy',
      service: 'eVault API',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      endpoints: [
        'POST /api/auth/callback',
        'GET /api/user',
        'POST /api/user/refresh',
        'GET /api/user/info',
        'POST /api/user/update-email',
        'DELETE /api/user/delete',
        'GET /api/vault/status',
        'POST /api/vault/register',
        'POST /api/vault/recover',
        'POST /api/vault/refresh',
        'GET /api/entries',
        'POST /api/entries',
        'DELETE /api/entries',
        'GET /api/entries/list',
        'GET /api/stats',
      ],
      authentication: 'NextAuth + JWT',
      database: 'PostgreSQL via Prisma',
      encryption: 'HPKE + OpenADP'
    })
  } catch (error) {
    return NextResponse.json(
      { 
        status: 'unhealthy',
        service: 'eVault API',
        error: 'Failed to get status',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
} 