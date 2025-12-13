/**
 * Health Check API - Checks auth service health
 * GET /api/health
 */

import type { RequestHandler } from '@builder.io/qwik-city';
import { getEnv } from '~/utils/env';

export const onGet: RequestHandler = async ({ json }) => {
  const authBase = getEnv('AUTH_BASE');

  if (!authBase) {
    json(500, {
      status: 'error',
      message: 'Auth service not configured',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  try {
    const resp = await fetch(`${authBase}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000), // 5 second timeout
    });

    if (!resp.ok) {
      json(503, {
        status: 'unhealthy',
        message: `Auth service returned ${resp.status}`,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const data = await resp.json();
    
    json(200, {
      status: 'healthy',
      auth_service: data,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    json(503, {
      status: 'unhealthy',
      message: `Failed to reach auth service: ${err instanceof Error ? err.message : 'Unknown error'}`,
      timestamp: new Date().toISOString(),
    });
  }
};
