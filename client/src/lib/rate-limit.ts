import { NextRequest, NextResponse } from 'next/server'

// Simple in-memory rate limiter
// In production, you'd want to use Redis or a database
interface RateLimitEntry {
  count: number
  resetTime: number
}

const rateLimitStore = new Map<string, RateLimitEntry>()

interface RateLimitConfig {
  maxRequests: number
  windowMs: number
  skipSuccessfulRequests?: boolean
}

// Default rate limits for different endpoint types
export const RATE_LIMITS = {
  // Authentication endpoints - stricter limits
  AUTH: { maxRequests: 5, windowMs: 15 * 60 * 1000 }, // 5 requests per 15 minutes
  
  // Vault operations - moderate limits
  VAULT: { maxRequests: 10, windowMs: 60 * 1000 }, // 10 requests per minute
  
  // Entry operations - more lenient
  ENTRIES: { maxRequests: 30, windowMs: 60 * 1000 }, // 30 requests per minute
  
  // General API - standard limits
  GENERAL: { maxRequests: 100, windowMs: 60 * 1000 }, // 100 requests per minute
} as const

export function rateLimit(config: RateLimitConfig) {
  return (request: NextRequest): NextResponse | null => {
    // Get client identifier (IP + User-Agent for better uniqueness)
    const forwarded = request.headers.get('x-forwarded-for')
    const ip = forwarded ? forwarded.split(',')[0] : 'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'
    const identifier = `${ip}:${userAgent.substring(0, 50)}`
    
    const now = Date.now()
    const entry = rateLimitStore.get(identifier)
    
    // Clean up expired entries periodically
    if (Math.random() < 0.01) { // 1% chance to clean up
      cleanupExpiredEntries(now)
    }
    
    if (!entry || now > entry.resetTime) {
      // First request or window expired
      rateLimitStore.set(identifier, {
        count: 1,
        resetTime: now + config.windowMs
      })
      return null // Allow request
    }
    
    if (entry.count >= config.maxRequests) {
      // Rate limit exceeded
      const resetIn = Math.ceil((entry.resetTime - now) / 1000)
      
      return NextResponse.json(
        { 
          error: 'Rate limit exceeded',
          message: `Too many requests. Try again in ${resetIn} seconds.`,
          retryAfter: resetIn
        },
        { 
          status: 429,
          headers: {
            'Retry-After': resetIn.toString(),
            'X-RateLimit-Limit': config.maxRequests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': entry.resetTime.toString()
          }
        }
      )
    }
    
    // Increment counter
    entry.count++
    rateLimitStore.set(identifier, entry)
    
    return null // Allow request
  }
}

// Helper function to create rate limit headers
export function addRateLimitHeaders(
  response: NextResponse, 
  config: RateLimitConfig, 
  identifier: string
): NextResponse {
  const entry = rateLimitStore.get(identifier)
  if (entry) {
    response.headers.set('X-RateLimit-Limit', config.maxRequests.toString())
    response.headers.set('X-RateLimit-Remaining', Math.max(0, config.maxRequests - entry.count).toString())
    response.headers.set('X-RateLimit-Reset', entry.resetTime.toString())
  }
  return response
}

// Cleanup expired entries to prevent memory leaks
function cleanupExpiredEntries(now: number) {
  const keysToDelete: string[] = []
  rateLimitStore.forEach((entry, key) => {
    if (now > entry.resetTime) {
      keysToDelete.push(key)
    }
  })
  keysToDelete.forEach(key => rateLimitStore.delete(key))
}

// Higher-order function to wrap API routes with rate limiting
export function withRateLimit(config: RateLimitConfig, handler: (req: NextRequest) => Promise<NextResponse>) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const rateLimitResponse = rateLimit(config)(request)
    if (rateLimitResponse) {
      return rateLimitResponse
    }
    
    return handler(request)
  }
} 