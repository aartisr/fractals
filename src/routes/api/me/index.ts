/**
 * Current User API - Returns authenticated user data
 * GET /api/me
 * 
 * Requires: Valid app_session_token cookie
 * Returns: { session, user } or 401 Unauthorized
 */

import type { RequestHandler } from '@builder.io/qwik-city';
import { getSessionFromAuthService, isSessionExpired } from '~/utils/auth-service';

export const onGet: RequestHandler = async ({ cookie, json, error, env }) => {
  const sessionToken = cookie.get('app_session_token')?.value;
  const expiresAt = cookie.get('app_session_expires')?.value;

  if (!sessionToken) {
    throw error(401, 'Not authenticated. Please log in.');
  }

  // Check if session is expired (client-side check)
  if (expiresAt && isSessionExpired(parseInt(expiresAt))) {
    // Clear expired cookies
    cookie.delete('app_session_token', { path: '/' });
    cookie.delete('app_session_expires', { path: '/' });
    throw error(401, 'Session expired. Please log in again.');
  }

  const authBase = env.get('AUTH_BASE');
  const clientId = env.get('AUTH_CLIENT_ID');

  if (!authBase || !clientId) {
    throw error(500, 'Auth configuration missing');
  }

  try {
    // Fetch session from auth service
    const data = await getSessionFromAuthService(sessionToken, clientId, authBase);
    
    json(200, data);
  } catch (err) {
    console.error('Get session error:', err);
    
    // If session is invalid, clear cookies
    if (err instanceof Error && err.message.includes('expired')) {
      cookie.delete('app_session_token', { path: '/' });
      cookie.delete('app_session_expires', { path: '/' });
      throw error(401, 'Session expired or invalid. Please log in again.');
    }
    
    throw error(500, `Failed to get user session: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }
};
