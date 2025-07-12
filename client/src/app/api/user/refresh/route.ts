import { NextRequest, NextResponse } from 'next/server'
import { withAuth, AuthenticatedRequest } from '@/lib/auth-middleware'
import { generateJWT } from '@/lib/jwt'

export async function POST(request: NextRequest) {
  return withAuth(request, async (req: AuthenticatedRequest) => {
    const token = generateJWT(req.user!.userId, req.user!.email)
    
    return NextResponse.json({ token })
  })
} 