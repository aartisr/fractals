/**
 * Subscription Current API Proxy
 * GET /api/subscriptions/current
 *
 * Proxies request to CMS backend via internal Docker network
 */

import type { RequestHandler } from '@builder.io/qwik-city';

export const onGet: RequestHandler = async ({ json, error, env, cookie }) => {
  const cmsUrl = env.get('CMS_URL') || 'http://cms:3000';

  try {
    const sessionToken = cookie.get('nandi_session_token')?.value;

    const headers: HeadersInit = {};

    if (sessionToken) {
      headers['Cookie'] = `nandi_session_token=${sessionToken}`;
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
