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
  
  console.log('🔧 Dynamically set NEXTAUTH_URL to:', process.env.NEXTAUTH_URL)
}

import NextAuth from 'next-auth'
import { authOptions } from '@/lib/auth'

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST } 