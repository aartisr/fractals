/**
 * Auth Callback Route - Handles OAuth callback from Nandi Auth server
 * GET /auth/callback
 */

import type { RequestHandler } from '@builder.io/qwik-city';
import { normalizeReturnTo } from '~/utils/auth-service';
import { getEnv } from '~/utils/env';

export const onGet: RequestHandler = async ({ query, cookie, redirect }) => {
  const authCode = query.get('auth_code');

  try {
    if (!authCode) {
      console.error('No auth_code found in query parameters');
      throw redirect(302, getEnv('AUTH_ERROR_URL', '/'));
    }

    const authBase = getEnv('AUTH_BASE');
    const clientId = getEnv('AUTH_CLIENT_ID');
    const clientSecret = getEnv('AUTH_CLIENT_SECRET');
    const baseUrl = getEnv('BASE_URL', 'http://localhost:5173');

    if (!authBase || !clientId || !clientSecret) {
      throw new Error('Auth configuration missing. Check environment variables.');
    }

    const res = await fetch(`${authBase}/auth/session/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code: authCode,
      }),
    });

    const data = await res.json();

    if (res.status !== 200) {
      console.error('Failed to exchange auth code:', data.message);
      throw redirect(302, getEnv('AUTH_ERROR_URL', '/'));
    }

    // Set cookie with the session token
    cookie.set('nandi_session_token', data.session_token, {
      httpOnly: true,
      sameSite: 'strict',
      path: '/',
      secure: true, // use true in production
      maxAge: 60 * 60 * 24, // 1 day
    });

    const normalizedReturnTo = normalizeReturnTo(query.get('returnTo'), baseUrl);
    const destination = new URL(normalizedReturnTo, baseUrl).toString();

    // Redirect to the intended page (always keep same origin)
    throw redirect(302, destination);
  } catch (error) {
    console.error('Authentication error:', error);
    throw redirect(302, getEnv('AUTH_ERROR_URL', '/'));
  }
};
