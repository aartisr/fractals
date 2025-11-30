/**
 * Superchat Set Default Payment Method API Proxy
 * POST /api/superchat/payment-methods/set-default
 *
 * Proxies request to CMS backend via internal Docker network
 */

import type { RequestHandler } from '@builder.io/qwik-city';

export const onPost: RequestHandler = async ({ request, json, error, env, cookie }) => {
  const cmsUrl = env.get('CMS_URL') || 'http://cms:3000';

  try {
    const body = await request.json();
    const sessionToken = cookie.get('nandi_session_token')?.value;

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (sessionToken) {
      headers['Cookie'] = `nandi_session_token=${sessionToken}`;
    }

    const response = await fetch(`${cmsUrl}/api/superchat/payment-methods/set-default`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    const data = await response.json();
    json(response.status, data);
  } catch (err) {
    console.error('[Proxy] Set default payment method error:', err);
    throw error(500, `Failed to set default payment method: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }
};
