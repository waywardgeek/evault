import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger';
import { withAuth, AuthenticatedRequest } from '@/lib/auth-middleware'
import { logger } from '@/lib/logger';
import { deleteUser, getEntriesByUserId } from '@/lib/db'
import { logger } from '@/lib/logger';

export async function DELETE(request: NextRequest) {
  return withAuth(request, async (req: AuthenticatedRequest) => {
    logger.debug('🗑️  Processing account deletion request')
    logger.debug(`👤 Processing account deletion for user: ${req.user!.email}`)

    try {
      // Get entry count for logging
      const entries = await getEntriesByUserId(req.user!.userId)
      logger.debug(`🗑️  Will delete user and ${entries.length} vault entries (CASCADE)`)

      // Delete the user (this will cascade delete related data)
      await deleteUser(req.user!.userId)

      logger.debug(`✅ Successfully deleted account for user: ${req.user!.email}`)
      
      return NextResponse.json({
        success: true,
        message: 'Account deleted successfully',
      })
    } catch (error) {
      logger.error('❌ Failed to delete user:', error)
      return NextResponse.json(
        { error: 'Failed to delete account' },
        { status: 500 }
      )
    }
  })
} 