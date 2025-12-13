/**
 * Login Route - Redirects to auth.kailasa.ai for authentication
 * GET /auth/login
 * 
 * Set USE_MOCK_AUTH=true in .env for local development
 */

import type { RequestHandler } from '@builder.io/qwik-city';
import { appendReturnToParam, buildSignInUrl, normalizeReturnTo } from '~/utils/auth-service';
import { getEnv } from '~/utils/env';

export const onGet: RequestHandler = async ({ redirect, query, request }) => {
  const useMockAuth = getEnv('USE_MOCK_AUTH') === 'true';
  
  if (useMockAuth) {
    // DEVELOPMENT MODE - Just redirect to the return URL or home
    const returnTo = query.get('returnTo') || '/';
    throw redirect(302, returnTo);
  }

  // PRODUCTION MODE - Redirect to auth.kailasa.ai
  const authBase = getEnv('AUTH_BASE');
  const clientId = getEnv('AUTH_CLIENT_ID');
  const redirectUri = getEnv('AUTH_REDIRECT_URI');
  const errorUrl = getEnv('AUTH_ERROR_URL');

  const referer = request.headers.get('referer');

  if (!authBase || !clientId || !redirectUri) {
    throw new Error('Auth configuration missing. Check environment variables.');
  }

  const baseUrl = getEnv('BASE_URL', 'http://localhost:5173');
  const returnTo = normalizeReturnTo(query.get('returnTo') || referer, baseUrl);
  const redirectWithReturnTo = appendReturnToParam(redirectUri, returnTo);
  const signInUrl = buildSignInUrl(authBase, clientId, redirectWithReturnTo, errorUrl);

  throw redirect(302, signInUrl);
};
