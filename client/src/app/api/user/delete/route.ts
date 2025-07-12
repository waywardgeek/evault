import { NextRequest, NextResponse } from 'next/server'
import { withAuth, AuthenticatedRequest } from '@/lib/auth-middleware'
import { deleteUser, getEntriesByUserId } from '@/lib/db'

export async function DELETE(request: NextRequest) {
  return withAuth(request, async (req: AuthenticatedRequest) => {
    console.log('🗑️  Processing account deletion request')
    console.log(`👤 Processing account deletion for user: ${req.user!.email}`)

    try {
      // Get entry count for logging
      const entries = await getEntriesByUserId(req.user!.userId)
      console.log(`🗑️  Will delete user and ${entries.length} vault entries (CASCADE)`)

      // Delete the user (this will cascade delete related data)
      await deleteUser(req.user!.userId)

      console.log(`✅ Successfully deleted account for user: ${req.user!.email}`)
      
      return NextResponse.json({
        success: true,
        message: 'Account deleted successfully',
      })
    } catch (error) {
      console.error('❌ Failed to delete user:', error)
      return NextResponse.json(
        { error: 'Failed to delete account' },
        { status: 500 }
      )
    }
  })
} 