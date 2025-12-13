/**
 * Total Views API
 * GET /api/viewers/total?streamId={id}&contentType={livestream|video}
 *
 * Returns the total number of viewers who have watched content
 * Counts all viewer sessions (including ended ones) for historical view count
 * Supports both livestreams and regular videos
 */

import type { RequestHandler} from '@builder.io/qwik-city';
import { getEnv } from '~/utils/env';

type ContentType = 'livestream' | 'video';

export const onGet: RequestHandler = async ({ query, error, json }) => {
  const cmsApiUrl = getEnv('CMS_URL', 'http://localhost:3000');
  const cmsApiKey = getEnv('CMS_API_KEY');

  if (!cmsApiKey) {
    console.error('[Total Views] CMS_API_KEY not set');
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

    // Query for all viewer sessions for this content
    // This gives us the total number of times people have watched (including re-watches)
    const response = await fetch(
      `${cmsApiUrl}/api/${collection}?where[${contentField}][equals]=${encodeURIComponent(contentId)}&limit=1`,
      {
        headers: {
          'Authorization': `users API-Key ${cmsApiKey}`,
        },
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error('[Total Views] CMS error:', response.status, errText);
      throw error(500, `Failed to get total views: ${errText}`);
    }

    const result = await response.json();

    json(200, {
      success: true,
      contentId,
      contentType,
      totalViews: result.totalDocs || 0,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[Total Views API] Error:', err);
    if (err instanceof Response) {
      throw err;
    }
    throw error(500, `Internal error: ${err instanceof Error ? err.message : String(err)}`);
  }
};
