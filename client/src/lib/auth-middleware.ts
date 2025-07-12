import { NextRequest, NextResponse } from 'next/server'
import { validateJWT, extractBearerToken } from './jwt'
import { getUserById } from './db'

export interface AuthenticatedRequest extends NextRequest {
  user?: {
    userId: string
    email: string
  }
}

export async function withAuth(
  request: NextRequest,
  handler: (req: AuthenticatedRequest) => Promise<NextResponse>
): Promise<NextResponse> {
  try {
    const token = extractBearerToken(request.headers.get('authorization'))
    
    if (!token) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      )
    }

    const payload = validateJWT(token)
    
    // Verify user exists in database
    const user = await getUserById(payload.userId)
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 401 }
      )
    }

    // Add user to request
    const authenticatedRequest = request as AuthenticatedRequest
    authenticatedRequest.user = {
      userId: user.userId,
      email: user.email,
    }

    return handler(authenticatedRequest)
  } catch (error) {
    return NextResponse.json(
      { error: 'Invalid token' },
      { status: 401 }
    )
  }
} 