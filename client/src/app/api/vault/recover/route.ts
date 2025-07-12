import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger';
import { withAuth, AuthenticatedRequest } from '@/lib/auth-middleware'
import { logger } from '@/lib/logger';
import { getCurrentOpenADPMetadata } from '@/lib/db'
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  return withAuth(request, async (req: AuthenticatedRequest) => {
    logger.debug('🔓 Processing vault recovery request')
    
    const body = await req.json()
    const { pin } = body

    // Validate PIN
    if (!pin) {
      logger.debug('❌ PIN is required for recovery')
      return NextResponse.json(
        { error: 'PIN is required' },
        { status: 400 }
      )
    }

    logger.debug(`👤 Processing recovery for user: ${req.user!.email}`)
    logger.debug(`📊 Recovery request: PIN length=${pin.length}`)

    try {
      // Get current metadata
      const currentMetadata = await getCurrentOpenADPMetadata(req.user!.userId)
      
      if (!currentMetadata) {
        logger.debug(`❌ User ${req.user!.email} has no vault registered`)
        return NextResponse.json(
          { error: 'No vault registered for this user' },
          { status: 404 }
        )
      }

      logger.debug(`✅ Vault recovery successful for user: ${req.user!.email}`)
      
      // Return the metadata for client-side OpenADP recovery
      return NextResponse.json({
        success: true,
        openadp_metadata: currentMetadata,
      })
    } catch (error) {
      logger.error('❌ Vault recovery failed:', error)
      return NextResponse.json(
        { error: 'Failed to recover vault' },
        { status: 500 }
      )
    }
  })
} 