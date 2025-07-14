import { NextRequest, NextResponse } from 'next/server'
import { withAuth, AuthenticatedRequest } from '@/lib/auth-middleware'
import { createEntry, getEntriesByUserId, getCurrentOpenADPMetadata, deleteEntry, getEntry } from '@/lib/db'
import { logger } from '@/lib/logger';
import crypto from 'crypto';

// Add new entry
export async function POST(request: NextRequest) {
  return withAuth(request, async (req: AuthenticatedRequest) => {
    const body = await req.json()
    const { name, hpke_blob, deletion_hash } = body

    if (!name || !hpke_blob || !deletion_hash) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    try {
      // Validate that user has a vault registered
      const currentMetadata = await getCurrentOpenADPMetadata(req.user!.userId)
      if (!currentMetadata) {
        return NextResponse.json(
          { error: 'Vault not registered. Please register vault first.' },
          { status: 400 }
        )
      }

      // Decode base64 data
      const hpkeBlob = Buffer.from(hpke_blob, 'base64')
      const deletionHash = Buffer.from(deletion_hash, 'base64')

      // Validate entry size (max 1KiB)
      if (hpkeBlob.length > 1024) {
        return NextResponse.json(
          { error: 'Entry size exceeds 1KiB limit' },
          { status: 400 }
        )
      }

      // Check user entry count (max 1024 entries)
      const entries = await getEntriesByUserId(req.user!.userId)
      if (entries.length >= 1024) {
        return NextResponse.json(
          { error: 'Maximum entry count (1024) reached' },
          { status: 400 }
        )
      }

      // Create entry
      await createEntry(req.user!.userId, name, hpkeBlob, deletionHash)

      return NextResponse.json({
        success: true,
        message: 'Entry added successfully',
      })
    } catch (error: any) {
      if (error.code === 'P2002') {
        return NextResponse.json(
          { error: 'Entry with this name already exists' },
          { status: 409 }
        )
      }
      logger.error('Failed to add entry:', error)
      return NextResponse.json(
        { error: 'Failed to add entry' },
        { status: 500 }
      )
    }
  })
}

// Get all entries
export async function GET(request: NextRequest) {
  return withAuth(request, async (req: AuthenticatedRequest) => {
    try {
      const entries = await getEntriesByUserId(req.user!.userId)

      const entryBlobs = entries.map((entry) => ({
        name: entry.name,
        hpke_blob: Buffer.from(entry.hpkeBlob).toString('base64'),
      }))

      return NextResponse.json({
        entries: entryBlobs,
      })
    } catch (error) {
      logger.error('Failed to retrieve entries:', error)
      return NextResponse.json(
        { error: 'Failed to retrieve entries' },
        { status: 500 }
      )
    }
  })
}

// Delete entry
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
      // Get the entry to verify deletion pre-hash
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