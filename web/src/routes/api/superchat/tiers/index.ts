/**
 * Superchat Tiers API Proxy
 * GET /api/superchat/tiers
 *
 * Proxies request to CMS backend via internal Docker network
 */

import type { RequestHandler } from '@builder.io/qwik-city';

export const onGet: RequestHandler = async ({ json, error, env }) => {
  const cmsUrl = env.get('CMS_URL') || 'http://cms:3000';

  try {
    const response = await fetch(`${cmsUrl}/api/superchat/tiers`, {
      method: 'GET',
    });

    const data = await response.json();
    json(response.status, data);
  } catch (err) {
    console.error('[Proxy] Get superchat tiers error:', err);
    throw error(500, `Failed to get superchat tiers: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }
};
