import { nanoid } from 'nanoid'
import bcrypt from 'bcryptjs'

/**
 * Generate a new edit secret (plain text).
 *
 * Password-based trees currently provide this secret from user input; this
 * helper remains for compatibility with older token-based flows.
 */
export function generateEditToken(): string {
  // Generate a 32-character random secret
  return nanoid(32)
}

/**
 * Hash an edit password/secret for storage in the database.
 * Never store plain edit credentials in the database.
 */
export async function hashToken(token: string): Promise<string> {
  const saltRounds = 10
  return bcrypt.hash(token, saltRounds)
}

/**
 * Verify an edit password/secret against the stored hash.
 * Returns true if the credential matches.
 */
export async function verifyToken(token: string, hash: string): Promise<boolean> {
  try {
    return await bcrypt.compare(token, hash)
  } catch (error) {
    console.error('Edit credential verification error:', error)
    return false
  }
}

/**
 * Generate and hash an edit secret in one step.
 * Returns both the plain secret and hash.
 */
export async function createEditToken(): Promise<{
  token: string
  hash: string
}> {
  const token = generateEditToken()
  const hash = await hashToken(token)
  return { token, hash }
}
