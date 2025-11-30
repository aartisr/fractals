/**
 * Superchat Setup Payment API Proxy
 * POST /api/superchat/setup-payment
 *
 * Proxies request to CMS backend via internal Docker network
 * This bypasses Cloudflare protection on the CMS
 */

import type { RequestHandler } from '@builder.io/qwik-city';

export const onPost: RequestHandler = async ({ request, json, error, env, cookie }) => {
  const cmsUrl = env.get('CMS_URL') || 'http://cms:3000';

  try {
    // Get the request body
    const body = await request.json();

    // Get the session token from cookies
    const sessionToken = cookie.get('nandi_session_token')?.value;

    // Forward the request to CMS with session cookie
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    // Add session cookie if available
    if (sessionToken) {
      headers['Cookie'] = `nandi_session_token=${sessionToken}`;
    }

    const response = await fetch(`${cmsUrl}/api/superchat/setup-payment`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    const data = await response.json();

    // Return the response from CMS
    json(response.status, data);
  } catch (err) {
    console.error('[Proxy] Setup payment error:', err);
    throw error(500, `Failed to setup payment: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }
};
