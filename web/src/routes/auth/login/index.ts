/**
 * Login Route - Redirects to auth.kailasa.ai for authentication
 * GET /auth/login
 */

import type { RequestHandler } from '@builder.io/qwik-city';
import { appendReturnToParam, buildSignInUrl, normalizeReturnTo } from '~/utils/auth-service';

export const onGet: RequestHandler = async ({ redirect, env, query, request }) => {
  const authBase = env.get('AUTH_BASE');
  const clientId = env.get('AUTH_CLIENT_ID');
  const redirectUri = env.get('AUTH_REDIRECT_URI');
  const errorUrl = env.get('AUTH_ERROR_URL');

  const referer = request.headers.get('referer');

  if (!authBase || !clientId || !redirectUri) {
    throw new Error('Auth configuration missing. Check environment variables.');
  }

  const baseUrl = env.get('BASE_URL') || 'http://localhost:5173';
  const returnTo = normalizeReturnTo(query.get('returnTo') || referer, baseUrl);
  const redirectWithReturnTo = appendReturnToParam(redirectUri, returnTo);
  const signInUrl = buildSignInUrl(authBase, clientId, redirectWithReturnTo, errorUrl);

  throw redirect(302, signInUrl);
};
