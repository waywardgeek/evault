import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { withAuth, AuthenticatedRequest } from '@/lib/auth-middleware'
import { getCurrentOpenADPMetadata, setOpenADPMetadata } from '@/lib/db'
import { withRateLimit, RATE_LIMITS } from '@/lib/rate-limit'

async function handleVaultRegister(request: NextRequest) {
  return withAuth(request, async (req: AuthenticatedRequest) => {
    logger.debug('🔐 Processing vault registration request')
    
    const body = await req.json()
    const { pin, openadp_metadata } = body

    // Validate PIN requirements
    if (!pin || pin.length < 4) {
      logger.debug(`❌ PIN too short: ${pin?.length || 0} characters`)
      return NextResponse.json(
        { error: 'PIN must be at least 4 characters long' },
        { status: 400 }
      )
    }
    
    if (pin.length > 128) {
      logger.debug(`❌ PIN too long: ${pin.length} characters`)
      return NextResponse.json(
        { error: 'PIN must be less than 128 characters' },
        { status: 400 }
      )
    }

    logger.debug(`👤 Processing registration for user: ${req.user!.email}`)

    try {
      // Check if user already has a vault
      const currentMetadata = await getCurrentOpenADPMetadata(req.user!.userId)
      if (currentMetadata !== null) {
        logger.debug(`⚠️  User ${req.user!.email} already has a vault registered`)
        return NextResponse.json(
          { error: 'User already has a vault registered' },
          { status: 409 }
        )
      }

      // Store the metadata using two-slot system
      logger.debug(`💾 Storing initial OpenADP metadata for user: ${req.user!.email}`)
      await setOpenADPMetadata(req.user!.userId, openadp_metadata)

      logger.debug(`✅ Vault registration successful for user: ${req.user!.email}`)
      
      return NextResponse.json({
        success: true,
      })
    } catch (error) {
      logger.error('❌ Vault registration failed:', error)
      return NextResponse.json(
        { error: 'Failed to register vault' },
        { status: 500 }
      )
    }
  })
}

export const POST = withRateLimit(RATE_LIMITS.VAULT, handleVaultRegister) 