import { NextRequest, NextResponse } from 'next/server'
import { withAuth, AuthenticatedRequest } from '@/lib/auth-middleware'
import { updateUserEmail } from '@/lib/db'

export async function POST(request: NextRequest) {
  return withAuth(request, async (req: AuthenticatedRequest) => {
    const body = await req.json()
    const { email } = body

    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    try {
      await updateUserEmail(req.user!.userId, email)
      
      return NextResponse.json({
        success: true,
        message: 'Email updated successfully',
        email,
      })
    } catch (error) {
      return NextResponse.json(
        { error: 'Failed to update email' },
        { status: 500 }
      )
    }
  })
} 