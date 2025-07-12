import { NextRequest, NextResponse } from 'next/server'
import { withAuth, AuthenticatedRequest } from '@/lib/auth-middleware'
import { getCurrentOpenADPMetadata, setOpenADPMetadata } from '@/lib/db'

export async function POST(request: NextRequest) {
  return withAuth(request, async (req: AuthenticatedRequest) => {
    console.log('🔐 Processing vault registration request')
    
    const body = await req.json()
    const { pin, openadp_metadata } = body

    // Validate PIN requirements
    if (!pin || pin.length < 4) {
      console.log(`❌ PIN too short: ${pin?.length || 0} characters`)
      return NextResponse.json(
        { error: 'PIN must be at least 4 characters long' },
        { status: 400 }
      )
    }
    
    if (pin.length > 128) {
      console.log(`❌ PIN too long: ${pin.length} characters`)
      return NextResponse.json(
        { error: 'PIN must be less than 128 characters' },
        { status: 400 }
      )
    }

    console.log(`👤 Processing registration for user: ${req.user!.email}`)

    try {
      // Check if user already has a vault
      const currentMetadata = await getCurrentOpenADPMetadata(req.user!.userId)
      if (currentMetadata !== null) {
        console.log(`⚠️  User ${req.user!.email} already has a vault registered`)
        return NextResponse.json(
          { error: 'User already has a vault registered' },
          { status: 409 }
        )
      }

      // Store the metadata using two-slot system
      console.log(`💾 Storing initial OpenADP metadata for user: ${req.user!.email}`)
      await setOpenADPMetadata(req.user!.userId, openadp_metadata)

      console.log(`✅ Vault registration successful for user: ${req.user!.email}`)
      
      return NextResponse.json({
        success: true,
      })
    } catch (error) {
      console.error('❌ Vault registration failed:', error)
      return NextResponse.json(
        { error: 'Failed to register vault' },
        { status: 500 }
      )
    }
  })
} 