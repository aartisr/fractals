/**
 * End Viewer Session API
 * POST /api/viewers/end
 *
 * Marks a viewer session as ended and calculates watch duration
 * Supports both livestreams and regular videos
 */

import type { RequestHandler } from '@builder.io/qwik-city';

type ContentType = 'livestream' | 'video';

export const onPost: RequestHandler = async ({ request, env, error, json }) => {
  const cmsApiUrl = env.get('CMS_URL') || 'http://localhost:3000';
  const cmsApiKey = env.get('CMS_API_KEY');

  if (!cmsApiKey) {
    console.error('[Viewer End] CMS_API_KEY not set');
    throw error(500, 'CMS API not configured');
  }

  try {
    const body = await request.json();
    const { sessionId, contentType = 'livestream', totalPausedTimeMs = 0 } = body as {
      sessionId: string;
      contentType?: ContentType;
      totalPausedTimeMs?: number;
    };

    if (!sessionId) {
      throw error(400, 'sessionId is required');
    }

    const collection = contentType === 'video' ? 'video-views' : 'live-stream-views';

    // Find the viewer session by sessionId
    const findResponse = await fetch(
      `${cmsApiUrl}/api/${collection}?where[sessionId][equals]=${encodeURIComponent(sessionId)}&limit=1`,
      {
        headers: {
          'Authorization': `users API-Key ${cmsApiKey}`,
        },
      }
    );

    if (!findResponse.ok) {
      const errText = await findResponse.text();
      console.error('[Viewer End] Find error:', findResponse.status, errText);
      throw error(500, `Failed to find viewer session: ${errText}`);
    }

    const findResult = await findResponse.json();

    if (!findResult.docs || findResult.docs.length === 0) {
      throw error(404, 'Viewer session not found');
    }

    const viewerSession = findResult.docs[0];
    const viewerId = viewerSession.id;

    // Calculate total session duration
    const endedAt = new Date();
    const startedAt = new Date(viewerSession.startedAt);
    const totalSessionTimeMs = endedAt.getTime() - startedAt.getTime();

    // Calculate actual watch duration (excluding paused time)
    const pausedTimeSeconds = Math.floor(totalPausedTimeMs / 1000);
    const totalSessionSeconds = Math.floor(totalSessionTimeMs / 1000);
    const watchDurationSeconds = Math.max(0, totalSessionSeconds - pausedTimeSeconds);

    // Update session with end time and duration
    const updateResponse = await fetch(`${cmsApiUrl}/api/${collection}/${viewerId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `users API-Key ${cmsApiKey}`,
      },
      body: JSON.stringify({
        endedAt: endedAt.toISOString(),
        watchDurationSeconds,
        pausedDurationSeconds: pausedTimeSeconds,
        isActive: false,
      }),
    });

    if (!updateResponse.ok) {
      const errText = await updateResponse.text();
      console.error('[Viewer End] Update error:', updateResponse.status, errText);
      throw error(500, `Failed to end viewer session: ${errText}`);
    }

    json(200, {
      success: true,
      sessionId,
      watchDurationSeconds,
    });
  } catch (err) {
    console.error('[Viewer End API] Error:', err);
    if (err instanceof Response) {
      throw err;
    }
    throw error(500, `Internal error: ${err instanceof Error ? err.message : String(err)}`);
  }
};
