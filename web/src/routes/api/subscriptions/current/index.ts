/**
 * Subscription Current API Proxy
 * GET /api/subscriptions/current
 *
 * Proxies request to CMS backend via internal Docker network
 */

import type { RequestHandler } from '@builder.io/qwik-city';
import { getEnv } from '~/utils/env';

export const onGet: RequestHandler = async ({ json, error, cookie }) => {
  const cmsUrl = getEnv('CMS_URL', 'http://localhost:3000');

  try {
    const sessionToken = cookie.get('nandi_session_token')?.value;

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    // Pass session token if available, otherwise CMS will use mock auth
    if (sessionToken) {
      headers['Authorization'] = `Bearer ${sessionToken}`;
    }

    const response = await fetch(`${cmsUrl}/api/subscriptions/current`, {
      method: 'GET',
      headers,
    });

    const data = await response.json();
    json(response.status, data);
  } catch (err) {
    console.error('[Proxy] Get current subscription error:', err);
    throw error(500, `Failed to get current subscription: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }
};
