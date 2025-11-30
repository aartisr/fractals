/**
 * Superchat Verify Setup API Proxy
 * GET /api/superchat/verify-setup?reference={reference}
 *
 * Proxies request to CMS backend via internal Docker network
 */

import type { RequestHandler } from '@builder.io/qwik-city';

export const onGet: RequestHandler = async ({ query, json, error, env, cookie }) => {
  const cmsUrl = env.get('CMS_URL') || 'http://cms:3000';
  const reference = query.get('reference');

  if (!reference) {
    throw error(400, 'Payment reference is required');
  }

  try {
    const sessionToken = cookie.get('nandi_session_token')?.value;

    const headers: HeadersInit = {};

    if (sessionToken) {
      headers['Cookie'] = `nandi_session_token=${sessionToken}`;
    }

    const response = await fetch(`${cmsUrl}/api/superchat/verify-setup?reference=${reference}`, {
      method: 'GET',
      headers,
    });

    const data = await response.json();
    json(response.status, data);
  } catch (err) {
    console.error('[Proxy] Verify setup error:', err);
    throw error(500, `Failed to verify payment method setup: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }
};
