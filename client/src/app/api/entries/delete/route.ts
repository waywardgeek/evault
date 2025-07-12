import { NextRequest, NextResponse } from 'next/server'
import { withAuth, AuthenticatedRequest } from '@/lib/auth-middleware'
import { deleteEntry, getEntry } from '@/lib/db'
import crypto from 'crypto'

export async function DELETE(request: NextRequest) {
  return withAuth(request, async (req: AuthenticatedRequest) => {
    const body = await req.json()
    const { name, deletion_token } = body

    if (!name || !deletion_token) {
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

      // Verify deletion token matches stored hash
      const tokenHash = crypto.createHash('sha256').update(deletion_token).digest()
      if (!tokenHash.equals(entry.deletionHash)) {
        return NextResponse.json(
          { error: 'Invalid deletion token' },
          { status: 403 }
        )
      }

      // Delete the entry
      await deleteEntry(req.user!.userId, name)

      return NextResponse.json({
        message: 'Entry deleted successfully',
      })
    } catch (error) {
      console.error('Failed to delete entry:', error)
      return NextResponse.json(
        { error: 'Failed to delete entry' },
        { status: 500 }
      )
    }
  })
} 