/**
 * Superchat Send API Proxy
 * POST /api/superchat/send
 *
 * Proxies request to CMS backend via internal Docker network
 */

import type { RequestHandler } from '@builder.io/qwik-city';
import { getEnv } from '~/utils/env';

export const onPost: RequestHandler = async ({ request, json, error, cookie }) => {
  const cmsUrl = getEnv('CMS_URL', 'http://cms:3000');

  try {
    const body = await request.json();
    const sessionToken = cookie.get('nandi_session_token')?.value;

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (sessionToken) {
      headers['Cookie'] = `nandi_session_token=${sessionToken}`;
    }

    const response = await fetch(`${cmsUrl}/api/superchat/send`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    const data = await response.json();
    json(response.status, data);
  } catch (err) {
    console.error('[Proxy] Send superchat error:', err);
    throw error(500, `Failed to send superchat: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }
};
