/**
 * Logout Route - Clears session and redirects to home
 * GET /auth/logout
 */

import type { RequestHandler } from '@builder.io/qwik-city';

export const onGet: RequestHandler = async ({ cookie, redirect }) => {
  // Clear Nandi Auth session cookie
  cookie.delete('nandi_session_token', { path: '/' });

  // Redirect to home page
  throw redirect(302, '/');
};
