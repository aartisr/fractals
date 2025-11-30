/**
 * Viewer Heartbeat API
 * POST /api/viewers/heartbeat
 *
 * Updates the lastHeartbeatAt timestamp to indicate the viewer is still active
 * Supports both livestreams and regular videos
 */

import type { RequestHandler } from '@builder.io/qwik-city';

type ContentType = 'livestream' | 'video';

export const onPost: RequestHandler = async ({ request, env, error, json }) => {
  const cmsApiUrl = env.get('CMS_URL') || 'http://localhost:3000';
  const cmsApiKey = env.get('CMS_API_KEY');

  if (!cmsApiKey) {
    console.error('[Viewer Heartbeat] CMS_API_KEY not set');
    throw error(500, 'CMS API not configured');
  }

  try {
    const body = await request.json();
    const { sessionId, quality, contentType = 'livestream' } = body as {
      sessionId: string;
      quality?: string;
      contentType?: ContentType;
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
      console.error('[Viewer Heartbeat] Find error:', findResponse.status, errText);
      throw error(500, `Failed to find viewer session: ${errText}`);
    }

    const findResult = await findResponse.json();

    if (!findResult.docs || findResult.docs.length === 0) {
      throw error(404, 'Viewer session not found');
    }

    const viewerId = findResult.docs[0].id;

    // Update lastHeartbeatAt and quality
    const updateData: any = {
      lastHeartbeatAt: new Date().toISOString(),
      isActive: true,
    };

    if (quality) {
      updateData.quality = quality;
    }

    const updateResponse = await fetch(`${cmsApiUrl}/api/${collection}/${viewerId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `users API-Key ${cmsApiKey}`,
      },
      body: JSON.stringify(updateData),
    });

    if (!updateResponse.ok) {
      const errText = await updateResponse.text();
      console.error('[Viewer Heartbeat] Update error:', updateResponse.status, errText);
      throw error(500, `Failed to update viewer session: ${errText}`);
    }

    json(200, {
      success: true,
      sessionId,
    });
  } catch (err) {
    console.error('[Viewer Heartbeat API] Error:', err);
    if (err instanceof Response) {
      throw err;
    }
    throw error(500, `Internal error: ${err instanceof Error ? err.message : String(err)}`);
  }
};
