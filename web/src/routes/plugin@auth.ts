/**
 * Auth Plugin - Provides user context to all routes via routeLoader$
 * This loader runs on every request and makes user data available
 */

import { routeLoader$ } from '@builder.io/qwik-city';
import { getSessionFromAuthService, isSessionExpired, type AuthUser } from '~/utils/auth-service';

export interface UserContext {
  isAuthenticated: boolean;
  user: AuthUser | null;
}

/**
 * Global auth loader - makes user available in all components
 * Usage: const user = useUserContext();
 */
export const useUserContext = routeLoader$<UserContext>(async ({ cookie, env }) => {
  const sessionToken = cookie.get('app_session_token')?.value;
  const expiresAt = cookie.get('app_session_expires')?.value;

  // No session token = not authenticated
  if (!sessionToken) {
    return { isAuthenticated: false, user: null };
  }

  // Check expiration
  if (expiresAt && isSessionExpired(parseInt(expiresAt))) {
    // Clean up expired cookies
    cookie.delete('app_session_token', { path: '/' });
    cookie.delete('app_session_expires', { path: '/' });
    return { isAuthenticated: false, user: null };
  }

  const authBase = env.get('AUTH_BASE');
  const clientId = env.get('AUTH_CLIENT_ID');

  if (!authBase || !clientId) {
    console.error('Auth configuration missing in plugin@auth');
    return { isAuthenticated: false, user: null };
  }

  try {
    const { user } = await getSessionFromAuthService(sessionToken, clientId, authBase);
    return { isAuthenticated: true, user };
  } catch (err) {
    console.error('Auth plugin error:', err);
    
    // Clear invalid session
    cookie.delete('app_session_token', { path: '/' });
    cookie.delete('app_session_expires', { path: '/' });
    
    return { isAuthenticated: false, user: null };
  }
});
