import { NextRequest, NextResponse } from 'next/server'
import { withAuth, AuthenticatedRequest } from '@/lib/auth-middleware'
import { setOpenADPMetadata } from '@/lib/db'
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  return withAuth(request, async (req: AuthenticatedRequest) => {
    logger.debug('🔄 Processing metadata refresh request')
    
    const body = await req.json()
    const { openadp_metadata } = body

    if (!openadp_metadata) {
      return NextResponse.json(
        { error: 'OpenADP metadata is required' },
        { status: 400 }
      )
    }

    logger.debug(`👤 Processing metadata refresh for user: ${req.user!.email}`)

    try {
      // Update metadata using two-slot system
      await setOpenADPMetadata(req.user!.userId, openadp_metadata)

      logger.debug(`✅ Metadata refresh successful for user: ${req.user!.email}`)
      
      return NextResponse.json({
        success: true,
        message: 'Metadata refreshed successfully',
      })
    } catch (error) {
      logger.error('❌ Metadata refresh failed:', error)
      return NextResponse.json(
        { error: 'Failed to refresh metadata' },
        { status: 500 }
      )
    }
  })
} 