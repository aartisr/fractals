/**
 * Authentication utilities for validating session IDs from auth.kailasa.ai
 *
 * This utility can be used across all custom endpoints and business logic
 * to authenticate users and extract user information from session IDs.
 */

import type { PayloadRequest } from 'payload'

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'https://auth.kailasa.ai'
const AUTH_CLIENT_ID = process.env.AUTH_CLIENT_ID || ''

export interface AuthUser {
  id: string
  email: string
  first_name?: string
  last_name?: string
  role?: string
}

/**
 * Extracts the session ID from the request cookies
 *
 * @param req - Payload request object
 * @returns Session ID string or null if not found
 */
export function getSessionToken(req: PayloadRequest): string | null {
  // Try to get from cookies first
  const cookies = req.headers?.get('cookie')
  if (cookies) {
    const match = cookies.match(/nandi_session_token=([^;]+)/)
    if (match) {
      return match[1]
    }
  }

  // Try to get from Authorization header as fallback
  const authHeader = req.headers?.get('authorization')
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7)
  }

  return null
}

/**
 * Validates a session ID with auth.kailasa.ai and returns user information
 *
 * @param token - Session ID to validate
 * @returns User object if valid, null if invalid
 */
export async function validateToken(token: string): Promise<AuthUser | null> {
  try {
    const response = await fetch(`${AUTH_SERVICE_URL}/auth/get-session?client_id=${AUTH_CLIENT_ID}`, {
      method: 'GET',
      headers: {
        'Cookie': `nandi_session_token=${token}`,
      },
    })

    if (!response.ok) {
      console.warn('[Auth] Token validation failed:', response.status)
      return null
    }

    const data = await response.json()

    if (!data.user) {
      console.warn('[Auth] Invalid session or missing user data')
      return null
    }

    return {
      id: String(data.user.id),
      email: data.user.email,
      first_name: data.user.first_name,
      last_name: data.user.last_name,
      role: data.user.role,
    }
  } catch (error) {
    console.error('[Auth] Error validating token:', error)
    return null
  }
}

/**
 * Authenticates a request by extracting and validating the session token
 *
 * This is the main authentication function to use in custom endpoints.
 * It extracts the token from cookies/headers and validates it with auth.kailasa.ai.
 *
 * @param req - Payload request object
 * @returns User object if authenticated, null if not authenticated
 *
 * @example
 * ```typescript
 * import { authenticateRequest } from '@/utils/auth'
 *
 * export const myEndpoint: PayloadHandler = async (req) => {
 *   const user = await authenticateRequest(req)
 *
 *   if (!user) {
 *     return Response.json({ error: 'Unauthorized' }, { status: 401 })
 *   }
 *
 *   // Use user.id, user.email, etc.
 *   console.log('Authenticated user:', user.email)
 * }
 * ```
 */
export async function authenticateRequest(req: PayloadRequest): Promise<AuthUser | null> {
  const token = getSessionToken(req)

  if (!token) {
    console.warn('[Auth] No session token found in request')
    return null
  }

  return await validateToken(token)
}

/**
 * Middleware-style authentication that sets req.user
 *
 * This function authenticates the request and populates req.user,
 * making it compatible with endpoints that expect req.user to be set.
 *
 * @param req - Payload request object
 * @returns True if authenticated, false otherwise
 *
 * @example
 * ```typescript
 * import { authenticateAndSetUser } from '@/utils/auth'
 *
 * export const myEndpoint: PayloadHandler = async (req) => {
 *   const isAuthenticated = await authenticateAndSetUser(req)
 *
 *   if (!isAuthenticated) {
 *     return Response.json({ error: 'Unauthorized' }, { status: 401 })
 *   }
 *
 *   // Now req.user is populated
 *   console.log('User ID:', req.user?.id)
 * }
 * ```
 */
export async function authenticateAndSetUser(req: PayloadRequest): Promise<boolean> {
  const user = await authenticateRequest(req)

  if (!user) {
    return false
  }

  // Set req.user to make it compatible with existing endpoint code
  req.user = user as any

  return true
}

/**
 * Requires authentication - throws an error response if not authenticated
 *
 * This is a convenience function that combines authentication check
 * with error response generation.
 *
 * @param req - Payload request object
 * @returns User object if authenticated
 * @throws Response with 401 status if not authenticated
 *
 * @example
 * ```typescript
 * import { requireAuth } from '@/utils/auth'
 *
 * export const myEndpoint: PayloadHandler = async (req) => {
 *   const user = await requireAuth(req)
 *   // If we get here, user is authenticated
 *   // If not, a 401 response was already thrown
 *
 *   return Response.json({ message: `Hello ${user.email}` })
 * }
 * ```
 */
export async function requireAuth(req: PayloadRequest): Promise<AuthUser> {
  const user = await authenticateRequest(req)

  if (!user) {
    throw Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Also set req.user for compatibility
  req.user = user as any

  return user
}
