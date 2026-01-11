/**
 * Verify admin API key from request headers
 * Used for admin-only operations (referral management)
 */
export function verifyAdminKey(apiKey: string | null | undefined): boolean {
  const validAdminKey = process.env.ADMIN_API_KEY

  if (!validAdminKey) {
    console.error('ADMIN_API_KEY not configured in environment')
    return false
  }

  if (!apiKey) {
    return false
  }

  // Use constant-time comparison to prevent timing attacks
  return timingSafeEqual(apiKey, validAdminKey)
}

/**
 * Extract admin API key from request headers
 * Expects X-Admin-Key header
 */
export function extractAdminKey(headers: Headers): string | null {
  return headers.get('x-admin-key') || headers.get('X-Admin-Key')
}

/**
 * Timing-safe string comparison
 * Prevents timing attacks on API key validation
 */
function timingSafeEqual(a: string, b: string): boolean {
  // If lengths differ, still compare to prevent timing leak
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)

  // Normalize to same length
  const len = Math.max(bufA.length, bufB.length)
  const paddedA = Buffer.alloc(len)
  const paddedB = Buffer.alloc(len)

  bufA.copy(paddedA)
  bufB.copy(paddedB)

  // Constant-time comparison
  let result = 0
  for (let i = 0; i < len; i++) {
    result |= paddedA[i] ^ paddedB[i]
  }

  // Also check original lengths
  return result === 0 && bufA.length === bufB.length
}
