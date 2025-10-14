/**
 * Logout Route - Clears session and redirects to home
 * GET /auth/logout
 */

import type { RequestHandler } from '@builder.io/qwik-city';

export const onGet: RequestHandler = async ({ cookie, redirect, env }) => {
  const isProduction = env.get('PUBLIC_PRODUCTION') === 'true';

  const deleteOptions = {
    path: '/',
    sameSite: 'lax' as const,
    secure: isProduction,
    httpOnly: true,
  };

  // Clear all auth-related cookies
  cookie.delete('app_session_token', deleteOptions);
  cookie.delete('app_session_expires', deleteOptions);
  
  // Clear legacy cookies if they exist
  cookie.delete('auth_token', deleteOptions);
  cookie.delete('user_type', deleteOptions);
  cookie.delete('userId', deleteOptions);
  cookie.delete('userType', deleteOptions);

  // Redirect to home page
  throw redirect(302, '/');
};
