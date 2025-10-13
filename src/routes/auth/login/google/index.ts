/**
 * Google Login Route - Redirects to auth.kailasa.ai for Google OAuth
 * GET /auth/login/google
 */

import type { RequestHandler } from '@builder.io/qwik-city';
import { buildGoogleSignInUrl } from '~/utils/auth-service';

export const onGet: RequestHandler = async ({ redirect, env }) => {
  const authBase = env.get('AUTH_BASE');
  const clientId = env.get('AUTH_CLIENT_ID');
  const redirectUri = env.get('AUTH_REDIRECT_URI');
  const errorUrl = env.get('AUTH_ERROR_URL');

  if (!authBase || !clientId || !redirectUri) {
    throw new Error('Auth configuration missing. Check environment variables.');
  }

  const googleSignInUrl = buildGoogleSignInUrl(authBase, clientId, redirectUri, errorUrl);

  throw redirect(302, googleSignInUrl);
};
