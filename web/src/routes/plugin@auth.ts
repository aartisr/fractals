/**
 * Auth Plugin - Provides user context to all routes via routeLoader$
 * This loader runs on every request and makes user data available
 */

import { routeLoader$ } from '@builder.io/qwik-city';
import { getSessionFromAuthService, isSessionExpired, type AuthUser } from '~/utils/auth-service';
import { getEnv } from '~/utils/env';
import { isMockAuthEnabled, getMockAuthUser } from '@shared/mock-auth';

export interface UserContext {
  isAuthenticated: boolean;
  user: AuthUser | null;
}

/**
 * Global auth loader - makes user available in all components
 * Usage: const user = useUserContext();
 * 
 * Set USE_MOCK_AUTH=true in .env for local development without auth.kailasa.ai
 */
export const useUserContext = routeLoader$<UserContext>(async ({ cookie }) => {
  // Check if mock auth is enabled (for local development)
  if (isMockAuthEnabled()) {
    // DEVELOPMENT MODE - Return mock authenticated user
    const mockUser = getMockAuthUser();
    const authUser: AuthUser = {
      id: mockUser.id,
      email: mockUser.email,
      first_name: mockUser.first_name,
      last_name: mockUser.last_name,
    };
    return { isAuthenticated: true, user: authUser };
  }

  // PRODUCTION MODE - Use real auth service
  const sessionToken = cookie.get('nandi_session_token')?.value;

  // No session token = not authenticated
  if (!sessionToken) {
    return { isAuthenticated: false, user: null };
  }

  const authBase = getEnv('AUTH_BASE');
  const clientId = getEnv('AUTH_CLIENT_ID');

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
    cookie.delete('nandi_session_token', { path: '/' });

    return { isAuthenticated: false, user: null };
  }
});
