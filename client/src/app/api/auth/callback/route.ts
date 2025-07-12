import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { createUser, getUserByEmail, updateUserAuthProvider } from '@/lib/db'
import { generateJWT } from '@/lib/jwt'
import { withRateLimit, RATE_LIMITS } from '@/lib/rate-limit'

async function handleAuthCallback(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Extract user info from NextAuth callback
    const { user, provider } = body
    
    if (!user?.email) {
      return NextResponse.json(
        { error: 'Invalid user data' },
        { status: 400 }
      )
    }

    // Check if user exists
    let dbUser = await getUserByEmail(user.email)
    
    if (dbUser) {
      // Update auth provider to track most recent login method
      await updateUserAuthProvider(dbUser.userId, provider || 'unknown')
    } else {
      // Create new user
      dbUser = await createUser(user.email, provider || 'unknown')
    }

    // Generate JWT token
    const token = generateJWT(dbUser.userId, dbUser.email)

    // Transform to match API types (snake_case)
    const apiUser = {
      user_id: dbUser.userId,
      email: dbUser.email,
      phone_number: dbUser.phoneNumber || undefined,
      auth_provider: dbUser.authProvider,
      verified: dbUser.verified,
      openadp_metadata: dbUser.openadpMetadataA || dbUser.openadpMetadataB || undefined,
      created_at: dbUser.createdAt.toISOString(),
      updated_at: dbUser.updatedAt.toISOString(),
    }

    return NextResponse.json({
      token,
      user: apiUser,
    })
  } catch (error) {
    logger.error('Auth callback error:', error)
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    )
  }
}

// Apply rate limiting to auth endpoints
export const POST = withRateLimit(RATE_LIMITS.AUTH, handleAuthCallback)

// Support GET for browser redirects (OAuth flow)
export const GET = withRateLimit(RATE_LIMITS.AUTH, handleAuthCallback) 