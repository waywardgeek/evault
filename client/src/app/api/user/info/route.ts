import { NextRequest, NextResponse } from 'next/server'
import { withAuth, AuthenticatedRequest } from '@/lib/auth-middleware'
import { getUserById, getCurrentOpenADPMetadata, getEntriesByUserId } from '@/lib/db'

export async function GET(request: NextRequest) {
  return withAuth(request, async (req: AuthenticatedRequest) => {
    const user = await getUserById(req.user!.userId)
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Get vault status
    const currentMetadata = await getCurrentOpenADPMetadata(user.userId)
    const hasVault = currentMetadata !== null

    // Get entries count
    const entries = await getEntriesByUserId(user.userId)

    return NextResponse.json({
      email: user.email,
      created_at: user.createdAt,
      has_vault: hasVault,
      total_entries: entries.length,
    })
  })
} 