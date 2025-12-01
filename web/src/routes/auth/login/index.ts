/**
 * Login Route - Redirects to auth.kailasa.ai for authentication
 * GET /auth/login
 */

import type { RequestHandler } from '@builder.io/qwik-city';
import { buildSignInUrl } from '~/utils/auth-service';

export const onGet: RequestHandler = async ({ url, redirect, env }) => {
  const authBase = env.get('AUTH_BASE');
  const clientId = env.get('AUTH_CLIENT_ID');
  const redirectUri = env.get('AUTH_REDIRECT_URI');
  const errorUrl = env.get('AUTH_ERROR_URL');

  if (!authBase || !clientId || !redirectUri) {
    throw new Error('Auth configuration missing. Check environment variables.');
  }

  // Get the desired redirect destination from query params
  const redirectTo = url.searchParams.get('redirect');

  const signInUrl = buildSignInUrl(authBase, clientId, redirectUri, errorUrl, redirectTo || undefined);

  throw redirect(302, signInUrl);
};
