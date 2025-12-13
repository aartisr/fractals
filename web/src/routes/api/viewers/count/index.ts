/**
 * Viewer Count API
 * GET /api/viewers/count?streamId={id}&contentType={livestream|video}
 *
 * Returns the current number of active viewers
 * Active viewers are those who have sent a heartbeat in the last 60 seconds
 * Supports both livestreams and regular videos
 */

import type { RequestHandler } from '@builder.io/qwik-city';
import { getEnv } from '~/utils/env';

type ContentType = 'livestream' | 'video';

export const onGet: RequestHandler = async ({ query, error, json }) => {
  const cmsApiUrl = getEnv('CMS_URL', 'http://localhost:3000');
  const cmsApiKey = getEnv('CMS_API_KEY');

  if (!cmsApiKey) {
    console.error('[Viewer Count] CMS_API_KEY not set');
    throw error(500, 'CMS API not configured');
  }

  const streamId = query.get('streamId');
  const videoId = query.get('videoId');
  const contentType = (query.get('contentType') || 'livestream') as ContentType;

  const contentId = streamId || videoId;

  if (!contentId) {
    throw error(400, 'streamId or videoId query parameter is required');
  }

  try {
    const collection = contentType === 'video' ? 'video-views' : 'live-stream-views';
    const contentField = contentType === 'video' ? 'video' : 'stream';

    // Consider a viewer active if they sent a heartbeat in the last 60 seconds
    const cutoffTime = new Date(Date.now() - 60 * 1000).toISOString();

    // Query for active viewers
    const response = await fetch(
      `${cmsApiUrl}/api/${collection}?where[${contentField}][equals]=${encodeURIComponent(contentId)}&where[isActive][equals]=true&where[lastHeartbeatAt][greater_than]=${encodeURIComponent(cutoffTime)}&limit=1000`,
      {
        headers: {
          'Authorization': `users API-Key ${cmsApiKey}`,
        },
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error('[Viewer Count] CMS error:', response.status, errText);
      throw error(500, `Failed to get viewer count: ${errText}`);
    }

    const result = await response.json();

    json(200, {
      success: true,
      contentId,
      contentType,
      viewerCount: result.totalDocs || 0,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[Viewer Count API] Error:', err);
    if (err instanceof Response) {
      throw err;
    }
    throw error(500, `Internal error: ${err instanceof Error ? err.message : String(err)}`);
  }
};
