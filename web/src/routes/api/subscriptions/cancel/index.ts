/**
 * Subscription Cancel API Proxy
 * POST /api/subscriptions/cancel
 *
 * Proxies request to CMS backend via internal Docker network
 */

import type { RequestHandler } from '@builder.io/qwik-city';
import { getEnv } from '~/utils/env';

export const onPost: RequestHandler = async ({ json, error, cookie }) => {
  const cmsUrl = getEnv('CMS_URL', 'http://cms:3000');

  try {
    const sessionToken = cookie.get('nandi_session_token')?.value;

    const headers: HeadersInit = {};

    if (sessionToken) {
      headers['Cookie'] = `nandi_session_token=${sessionToken}`;
    }

    const response = await fetch(`${cmsUrl}/api/subscriptions/cancel`, {
      method: 'POST',
      headers,
    });

    const data = await response.json();
    json(response.status, data);
  } catch (err) {
    console.error('[Proxy] Cancel subscription error:', err);
    throw error(500, `Failed to cancel subscription: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }
};
