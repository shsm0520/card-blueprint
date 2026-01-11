/**
 * Simple in-memory rate limiter for MVP
 * For production, consider using Redis or a dedicated service
 */

interface RateLimitEntry {
  count: number
  resetAt: number
}

// In-memory storage for rate limiting
// Key format: "{action}:{ip}"
const store = new Map<string, RateLimitEntry>()

// Cleanup old entries every 10 minutes
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of store.entries()) {
    if (entry.resetAt < now) {
      store.delete(key)
    }
  }
}, 10 * 60 * 1000)

export interface RateLimitConfig {
  maxRequests: number
  windowMs: number // Time window in milliseconds
}

export interface RateLimitResult {
  allowed: boolean
  limit: number
  remaining: number
  resetAt: number
}

/**
 * Rate limit configurations for different actions
 */
export const rateLimitConfigs = {
  createTree: {
    maxRequests: 5,
    windowMs: 60 * 60 * 1000, // 1 hour
  },
  createTreeDaily: {
    maxRequests: 10,
    windowMs: 24 * 60 * 60 * 1000, // 24 hours
  },
  viewTree: {
    maxRequests: 100,
    windowMs: 60 * 60 * 1000, // 1 hour
  },
  editTree: {
    maxRequests: 30,
    windowMs: 60 * 60 * 1000, // 1 hour
  },
} as const

/**
 * Check rate limit for a given action and IP
 */
export function checkRateLimit(
  action: keyof typeof rateLimitConfigs,
  ip: string
): RateLimitResult {
  // Allow bypass in development if configured
  if (process.env.RATE_LIMIT_ENABLED === 'false') {
    return {
      allowed: true,
      limit: 999999,
      remaining: 999999,
      resetAt: Date.now() + 60000,
    }
  }

  const config = rateLimitConfigs[action]
  const key = `${action}:${ip}`
  const now = Date.now()

  let entry = store.get(key)

  // Create new entry if doesn't exist or expired
  if (!entry || entry.resetAt < now) {
    entry = {
      count: 0,
      resetAt: now + config.windowMs,
    }
    store.set(key, entry)
  }

  // Increment counter
  entry.count++

  const allowed = entry.count <= config.maxRequests
  const remaining = Math.max(0, config.maxRequests - entry.count)

  return {
    allowed,
    limit: config.maxRequests,
    remaining,
    resetAt: entry.resetAt,
  }
}

/**
 * Extract IP address from request
 * Checks X-Forwarded-For header first (for proxies), then falls back to direct IP
 */
export function getClientIp(request: Request): string {
  // Check X-Forwarded-For header (common with proxies/CDNs)
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    // Take the first IP if there are multiple
    return forwarded.split(',')[0].trim()
  }

  // Check X-Real-IP header (some proxies use this)
  const realIp = request.headers.get('x-real-ip')
  if (realIp) {
    return realIp.trim()
  }

  // Fallback to 'unknown' for local development
  return 'unknown'
}

/**
 * Create rate limit response headers
 */
export function createRateLimitHeaders(result: RateLimitResult): HeadersInit {
  return {
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': new Date(result.resetAt).toISOString(),
  }
}

/**
 * Check multiple rate limits (e.g., hourly AND daily)
 * Returns first failed limit, or success if all pass
 */
export function checkMultipleRateLimits(
  actions: Array<keyof typeof rateLimitConfigs>,
  ip: string
): RateLimitResult {
  for (const action of actions) {
    const result = checkRateLimit(action, ip)
    if (!result.allowed) {
      return result
    }
  }

  // All passed - return the most restrictive one
  const results = actions.map((action) => checkRateLimit(action, ip))
  return results.reduce((prev, curr) =>
    curr.remaining < prev.remaining ? curr : prev
  )
}
