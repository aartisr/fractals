/**
 * Start Viewer Session API
 * POST /api/viewers/start
 *
 * Creates a new viewer session when someone starts watching content
 * Supports both livestreams and regular videos
 */

import type { RequestHandler } from '@builder.io/qwik-city';
import { getEnv } from '~/utils/env';

type ContentType = 'livestream' | 'video';

export const onPost: RequestHandler = async ({ request, cookie, error, json }) => {
  const cmsApiUrl = getEnv('CMS_URL', 'http://localhost:3000');
  const cmsApiKey = getEnv('CMS_API_KEY');

  if (!cmsApiKey) {
    console.error('[Viewer Start] CMS_API_KEY not set');
    throw error(500, 'CMS API not configured');
  }

  try {
    const body = await request.json();
    const { sessionId, streamId, videoId, viewerName, quality, contentType = 'livestream' } = body as {
      sessionId: string;
      streamId?: string;
      videoId?: string;
      viewerName?: string;
      quality?: string;
      contentType?: ContentType;
    };

    const contentId = streamId || videoId;

    if (!sessionId || !contentId) {
      throw error(400, 'sessionId and either streamId or videoId are required');
    }

    // Get user info from session if available
    // Note: ecitizen tracking is optional and can be implemented later
    // when proper authentication integration is set up
    const ecitizen = null;

    // Get IP address and user agent
    const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0].trim()
      || request.headers.get('x-real-ip')
      || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Detect device type from user agent
    let deviceType = 'unknown';
    if (userAgent.toLowerCase().includes('mobile')) {
      deviceType = 'mobile';
    } else if (userAgent.toLowerCase().includes('tablet') || userAgent.toLowerCase().includes('ipad')) {
      deviceType = 'tablet';
    } else if (userAgent !== 'unknown') {
      deviceType = 'desktop';
    }

    // Determine collection and field name based on content type
    const collection = contentType === 'video' ? 'video-views' : 'live-stream-views';
    const contentField = contentType === 'video' ? 'video' : 'stream';

    // Convert contentId to number for Payload CMS relationship field
    const contentIdNumber = parseInt(contentId, 10);
    if (isNaN(contentIdNumber)) {
      throw error(400, `Invalid ${contentType} ID: ${contentId}`);
    }

    // Create viewer session in CMS
    const viewerData: any = {
      sessionId,
      [contentField]: contentIdNumber,
      ecitizen,
      viewerName: viewerName || 'Anonymous',
      ipAddress,
      userAgent,
      deviceType,
      quality,
      startedAt: new Date().toISOString(),
      isActive: true,
    };

    const response = await fetch(`${cmsApiUrl}/api/${collection}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `users API-Key ${cmsApiKey}`,
      },
      body: JSON.stringify(viewerData),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('[Viewer Start] CMS error:', response.status, errText);
      throw error(500, `Failed to create viewer session: ${errText}`);
    }

    const result = await response.json();

    json(200, {
      success: true,
      sessionId: result.doc.sessionId,
      viewerId: result.doc.id,
    });
  } catch (err) {
    console.error('[Viewer Start API] Error:', err);
    if (err instanceof Response) {
      throw err;
    }
    throw error(500, `Internal error: ${err instanceof Error ? err.message : String(err)}`);
  }
};
