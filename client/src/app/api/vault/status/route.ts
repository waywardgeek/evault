import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger';
import { withAuth, AuthenticatedRequest } from '@/lib/auth-middleware'
import { logger } from '@/lib/logger';
import { getCurrentOpenADPMetadata } from '@/lib/db'
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  return withAuth(request, async (req: AuthenticatedRequest) => {
    try {
      // Get current metadata using two-slot system
      const currentMetadata = await getCurrentOpenADPMetadata(req.user!.userId)
      const hasVault = currentMetadata !== null

      return NextResponse.json({
        has_vault: hasVault,
        openadp_metadata: currentMetadata,
      })
    } catch (error) {
      logger.error('Failed to get vault status:', error)
      return NextResponse.json(
        { error: 'Failed to get vault status' },
        { status: 500 }
      )
    }
  })
} 