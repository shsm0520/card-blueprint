import { nanoid } from 'nanoid'
import bcrypt from 'bcryptjs'

/**
 * Generate a new edit token (plain text)
 * This should be shown to the user only once at tree creation
 */
export function generateEditToken(): string {
  // Generate a 32-character random token
  return nanoid(32)
}

/**
 * Hash an edit token for storage in the database
 * Never store plain tokens in the database
 */
export async function hashToken(token: string): Promise<string> {
  const saltRounds = 10
  return bcrypt.hash(token, saltRounds)
}

/**
 * Verify an edit token against the stored hash
 * Returns true if the token matches
 */
export async function verifyToken(token: string, hash: string): Promise<boolean> {
  try {
    return await bcrypt.compare(token, hash)
  } catch (error) {
    console.error('Token verification error:', error)
    return false
  }
}

/**
 * Generate and hash a token in one step
 * Returns both the plain token (to show user) and hash (to store in DB)
 */
export async function createEditToken(): Promise<{
  token: string
  hash: string
}> {
  const token = generateEditToken()
  const hash = await hashToken(token)
  return { token, hash }
}
