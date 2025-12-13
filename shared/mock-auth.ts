/**
 * Centralized Mock Authentication Configuration
 *
 * This file contains all mock authentication logic used across the application.
 * Use this to maintain consistency between CMS and web app authentication.
 */

export interface MockAuthUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role?: string;
}

/**
 * Mock user for development/testing
 * Used when USE_MOCK_AUTH environment variable is set to 'true'
 */
export const MOCK_AUTH_USER: MockAuthUser = {
  id: 'dev-user-123',
  email: 'dev@example.com',
  first_name: 'Development',
  last_name: 'User',
  role: 'admin',
};

/**
 * Check if mock authentication is enabled
 *
 * @returns True if USE_MOCK_AUTH environment variable is 'true'
 */
export function isMockAuthEnabled(): boolean {
  // Works in both Node.js (CMS) and browser (web app)
  const env = typeof process !== 'undefined' && process.env
    ? process.env.USE_MOCK_AUTH
    : (typeof import.meta !== 'undefined' && (import.meta as any).env)
      ? (import.meta as any).env.USE_MOCK_AUTH
      : undefined;

  return env === 'true';
}

/**
 * Get the mock authentication user
 *
 * @returns Mock user object
 */
export function getMockAuthUser(): MockAuthUser {
  return { ...MOCK_AUTH_USER };
}

/**
 * Create a mock session token
 *
 * @returns A consistent mock session token string
 */
export function getMockSessionToken(): string {
  return 'mock-dev-session-token';
}

/**
 * Get the authenticated user based on environment
 *
 * If mock auth is enabled, returns the mock user.
 * Otherwise returns null (real auth should be used).
 *
 * @returns Mock user if enabled, null otherwise
 */
export function getAuthUserIfMockEnabled(): MockAuthUser | null {
  if (isMockAuthEnabled()) {
    return getMockAuthUser();
  }
  return null;
}
