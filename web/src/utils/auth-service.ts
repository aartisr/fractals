/**
 * Auth Service Integration with auth.kailasa.ai
 * Handles authentication flow, token management, and user session
 */

export interface AuthUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  gender?: string;
  created_at?: string;
}

export interface AuthSession {
  token: string;
  expires_at: number;
}

export interface GetSessionResponse {
  session: AuthSession;
  user: AuthUser;
}

export interface ExchangeTokenResponse {
  session_token: string;
  expires_at: number;
}

/**
 * Exchange auth_code for session_token
 * Called from server-side only (has client_secret)
 */
export async function exchangeAuthCode(
  authCode: string,
  clientId: string,
  clientSecret: string,
  authBase: string
): Promise<ExchangeTokenResponse> {

  const body = JSON.stringify({
    code: authCode,
    client_id: clientId,
    client_secret: clientSecret,
  });

  const resp = await fetch(`${authBase}/auth/session/exchange-token`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body,
  });

  if (!resp.ok) {
    let text;
    try {
      text = await resp.text();
      // Try to parse JSON for more details
      try {
        const json = JSON.parse(text);
        // Log the full backend error for debugging
        // eslint-disable-next-line no-console
        console.error('[auth-service] Token exchange backend error:', json);
      } catch (e) {
        // Not JSON, log as text
        // eslint-disable-next-line no-console
        console.error('[auth-service] Token exchange backend error (raw):', text);
      }
    } catch (e) {
      text = '[unreadable response]';
      // eslint-disable-next-line no-console
      console.error('[auth-service] Token exchange backend error (unreadable)');
    }
    throw new Error(`Token exchange failed: ${resp.status} ${text}`);
  }

  return await resp.json() as ExchangeTokenResponse;
}

/**
 * Get current session and user data from auth service
 * Requires valid nandi_session cookie
 */
export async function getSessionFromAuthService(
  sessionToken: string,
  clientId: string,
  authBase: string
): Promise<GetSessionResponse> {
  const url = new URL(`${authBase}/auth/get-session`);
  url.searchParams.set('client_id', clientId);

  const resp = await fetch(url, {
    method: 'GET',
    headers: {
      // Forward the session token as the auth service expects it
      cookie: `nandi_session=${sessionToken}`,
    },
  });

  if (resp.status === 401) {
    throw new Error('Session expired or invalid');
  }

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Get session failed: ${resp.status} ${text}`);
  }

  return await resp.json() as GetSessionResponse;
}

/**
 * Build sign-in URL for redirecting to auth service
 */
export function buildSignInUrl(
  authBase: string,
  clientId: string,
  redirectUri: string,
  errorCallbackUrl?: string,
  redirectTo?: string
): string {
  // If redirectTo is provided, append it to the redirect_uri
  let finalRedirectUri = redirectUri;
  if (redirectTo) {
    const separator = redirectUri.includes('?') ? '&' : '?';
    finalRedirectUri = `${redirectUri}${separator}redirect_to=${encodeURIComponent(redirectTo)}`;
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: finalRedirectUri,
  });

  if (errorCallbackUrl) {
    params.set('error_callback_url', errorCallbackUrl);
  }

  return `${authBase}/auth/sign-in/email?${params.toString()}`;
}

/**
 * Append a relative return path to the redirect URI so we can remember where to send
 * the user after authentication.
 */
export function appendReturnToParam(redirectUri: string, returnTo: string): string {
  if (!returnTo) {
    return redirectUri;
  }

  try {
    const url = new URL(redirectUri);
    url.searchParams.set('returnTo', returnTo);
    return url.toString();
  } catch (err) {
    console.error('[auth-service] Failed to append returnTo to redirect URI:', err);
    return redirectUri;
  }
}

/**
 * Normalize a returnTo string to a relative path that stays within this host.
 */
export function normalizeReturnTo(returnTo: string | null | undefined, baseUrl: string): string {
  if (!returnTo) {
    return '/';
  }

  try {
    const base = new URL(baseUrl);
    const target = new URL(returnTo, base);
    if (target.origin !== base.origin) {
      return '/';
    }
    return `${target.pathname}${target.search}`;
  } catch (err) {
    console.error('[auth-service] Failed to normalize returnTo path:', err);
    return '/';
  }
}

/**
 * Build a login link that preserves the desired return path.
 */
export function buildLoginUrl(returnTo?: string): string {
  if (!returnTo) {
    return '/auth/login';
  }

  const params = new URLSearchParams();
  params.set('returnTo', returnTo);
  return `/auth/login?${params.toString()}`;
}

/**
 * Build Google OAuth sign-in URL
 */
export function buildGoogleSignInUrl(
  authBase: string,
  clientId: string,
  redirectUri: string,
  errorCallbackUrl?: string,
  redirectTo?: string
): string {
  // If redirectTo is provided, append it to the redirect_uri
  let finalRedirectUri = redirectUri;
  if (redirectTo) {
    const separator = redirectUri.includes('?') ? '&' : '?';
    finalRedirectUri = `${redirectUri}${separator}redirect_to=${encodeURIComponent(redirectTo)}`;
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: finalRedirectUri,
  });

  if (errorCallbackUrl) {
    params.set('error_callback_url', errorCallbackUrl);
  }

  return `${authBase}/auth/sign-in/google?${params.toString()}`;
}

/**
 * Check if session token is expired
 */
export function isSessionExpired(expiresAt: number): boolean {
  return Date.now() >= expiresAt * 1000; // expires_at is in seconds
}

/**
 * Calculate maxAge for cookie based on expires_at
 */
export function calculateCookieMaxAge(expiresAt: number): number {
  const now = Math.floor(Date.now() / 1000);
  return Math.max(0, expiresAt - now);
}
