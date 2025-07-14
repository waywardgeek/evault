import { NextRequest, NextResponse } from 'next/server'
import { withAuth, AuthenticatedRequest } from '@/lib/auth-middleware'
import { deleteEntry, getEntry } from '@/lib/db'
import crypto from 'crypto'
import { logger } from '@/lib/logger';

export async function DELETE(request: NextRequest) {
  return withAuth(request, async (req: AuthenticatedRequest) => {
    const body = await req.json()
    const { name, deletion_pre_hash } = body

    if (!name || !deletion_pre_hash) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    try {
      // Get the entry to verify deletion token
      const entry = await getEntry(req.user!.userId, name)
      if (!entry) {
        return NextResponse.json(
          { error: 'Entry not found' },
          { status: 404 }
        )
      }

      // Verify deletion pre-hash matches stored hash
      const deletionPreHashBuffer = Buffer.from(deletion_pre_hash, 'base64')
      const tokenHash = crypto.createHash('sha256').update(deletionPreHashBuffer).digest()
      if (!tokenHash.equals(entry.deletionHash)) {
        return NextResponse.json(
          { error: 'Invalid deletion pre-hash' },
          { status: 403 }
        )
      }

      // Delete the entry
      await deleteEntry(req.user!.userId, name)

      return NextResponse.json({
        message: 'Entry deleted successfully',
      })
    } catch (error) {
      logger.error('Failed to delete entry:', error)
      return NextResponse.json(
        { error: 'Failed to delete entry' },
        { status: 500 }
      )
    }
  })
} 