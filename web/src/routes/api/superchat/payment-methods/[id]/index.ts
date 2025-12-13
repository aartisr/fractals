/**
 * Superchat Payment Method Delete API Proxy
 * DELETE /api/superchat/payment-methods/:id
 *
 * Proxies request to CMS backend via internal Docker network
 */

import type { RequestHandler } from '@builder.io/qwik-city';
import { getEnv } from '~/utils/env';

export const onDelete: RequestHandler = async ({ params, json, error, cookie }) => {
  const cmsUrl = getEnv('CMS_URL', 'http://cms:3000');
  const methodId = params.id;

  if (!methodId) {
    throw error(400, 'Payment method ID is required');
  }

  try {
    const sessionToken = cookie.get('nandi_session_token')?.value;

    const headers: HeadersInit = {};

    if (sessionToken) {
      headers['Cookie'] = `nandi_session_token=${sessionToken}`;
    }

    const response = await fetch(`${cmsUrl}/api/superchat/payment-methods/${methodId}`, {
      method: 'DELETE',
      headers,
    });

    const data = await response.json();
    json(response.status, data);
  } catch (err) {
    console.error('[Proxy] Delete payment method error:', err);
    throw error(500, `Failed to delete payment method: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }
};
