// WORKAROUND: Set NEXTAUTH_URL dynamically if not already set
if (!process.env.NEXTAUTH_URL) {
  // In production, use the custom domain
  if (process.env.NODE_ENV === 'production' && process.env.VERCEL_ENV === 'production') {
    // Use VERCEL_PROJECT_PRODUCTION_URL if available
    if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
      process.env.NEXTAUTH_URL = `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    } else {
      // Fallback to hardcoded custom domain
      process.env.NEXTAUTH_URL = 'https://evaultapp.com'
    }
  } else if (process.env.VERCEL_URL) {
    // For preview deployments
    process.env.NEXTAUTH_URL = `https://${process.env.VERCEL_URL}`
  }
  
  logger.debug('🔧 Dynamically set NEXTAUTH_URL to:', process.env.NEXTAUTH_URL)
}

import NextAuth from 'next-auth'
import { logger } from '@/lib/logger';
import { authOptions } from '@/lib/auth'
import { logger } from '@/lib/logger';

logger.debug('🔧 NextAuth Route Handler Loaded')

const handler = NextAuth(authOptions)

// Add debugging wrapper
const debugHandler = async (req: Request, context: any) => {
  logger.debug('🔍 NextAuth Request:', {
    method: req.method,
    url: req.url,
    headers: Object.fromEntries(req.headers.entries()),
    params: context.params,
    timestamp: new Date().toISOString()
  })
  
  try {
    const response = await handler(req, context)
    logger.debug('✅ NextAuth Response:', {
      status: response.status,
      headers: Object.fromEntries(response.headers.entries()),
      timestamp: new Date().toISOString()
    })
    return response
  } catch (error) {
    logger.error('❌ NextAuth Error:', error)
    throw error
  }
}

export { debugHandler as GET, debugHandler as POST } 