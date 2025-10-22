/**
 * Current User API - Returns authenticated user data
 * GET /api/me
 *
 * Requires: Valid nandi_session_token cookie
 * Returns: { session, user } or 401 Unauthorized
 */

import type { RequestHandler } from '@builder.io/qwik-city';
import { getSessionFromAuthService } from '~/utils/auth-service';

export const onGet: RequestHandler = async ({ cookie, json, error, env }) => {
  const sessionToken = cookie.get('nandi_session_token')?.value;

  if (!sessionToken) {
    throw error(401, 'Not authenticated. Please log in.');
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
      cookie.delete('nandi_session_token', { path: '/' });
      throw error(401, 'Session expired or invalid. Please log in again.');
    }

    throw error(500, `Failed to get user session: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }
};
