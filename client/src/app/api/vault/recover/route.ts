import { NextRequest, NextResponse } from 'next/server'
import { withAuth, AuthenticatedRequest } from '@/lib/auth-middleware'
import { getCurrentOpenADPMetadata } from '@/lib/db'

export async function POST(request: NextRequest) {
  return withAuth(request, async (req: AuthenticatedRequest) => {
    console.log('🔓 Processing vault recovery request')
    
    const body = await req.json()
    const { pin } = body

    // Validate PIN
    if (!pin) {
      console.log('❌ PIN is required for recovery')
      return NextResponse.json(
        { error: 'PIN is required' },
        { status: 400 }
      )
    }

    console.log(`👤 Processing recovery for user: ${req.user!.email}`)
    console.log(`📊 Recovery request: PIN length=${pin.length}`)

    try {
      // Get current metadata
      const currentMetadata = await getCurrentOpenADPMetadata(req.user!.userId)
      
      if (!currentMetadata) {
        console.log(`❌ User ${req.user!.email} has no vault registered`)
        return NextResponse.json(
          { error: 'No vault registered for this user' },
          { status: 404 }
        )
      }

      console.log(`✅ Vault recovery successful for user: ${req.user!.email}`)
      
      // Return the metadata for client-side OpenADP recovery
      return NextResponse.json({
        success: true,
        openadp_metadata: currentMetadata,
      })
    } catch (error) {
      console.error('❌ Vault recovery failed:', error)
      return NextResponse.json(
        { error: 'Failed to recover vault' },
        { status: 500 }
      )
    }
  })
} 