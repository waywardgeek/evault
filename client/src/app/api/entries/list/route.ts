import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger';
import { withAuth, AuthenticatedRequest } from '@/lib/auth-middleware'
import { logger } from '@/lib/logger';
import { getEntriesByUserId } from '@/lib/db'
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  return withAuth(request, async (req: AuthenticatedRequest) => {
    try {
      const entries = await getEntriesByUserId(req.user!.userId)

      const names = entries.map(entry => entry.name)

      return NextResponse.json({
        names,
      })
    } catch (error) {
      logger.error('Failed to retrieve entries:', error)
      return NextResponse.json(
        { error: 'Failed to retrieve entries' },
        { status: 500 }
      )
    }
  })
} 