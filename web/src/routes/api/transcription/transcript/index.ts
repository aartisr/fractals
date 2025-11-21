/**
 * Transcription API - Gets transcript segments for a live stream
 * GET /api/transcription/transcript?streamId={id}&language={en}
 */

import type { RequestHandler } from '@builder.io/qwik-city';

export const onGet: RequestHandler = async ({ query, json, env }) => {
  const streamId = query.get('streamId');
  const language = query.get('language') || 'en';

  if (!streamId) {
    json(400, {
      success: false,
      error: 'streamId query parameter is required',
    });
    return;
  }

  try {
    // Get transcription service URL from environment
    const base =
      env.get('TRANSCRIPTION_API_URL') ||
      'http://live-translation-api:8090';

    const url = `${base}/transcription/${encodeURIComponent(
      streamId,
    )}/transcript?language=${encodeURIComponent(language)}`;

    const res = await fetch(url);

    if (!res.ok) {
      console.error('[Transcription API] Service error:', res.status, res.statusText);
      json(res.status, {
        success: false,
        error: `Transcription service error: ${res.statusText}`,
      });
      return;
    }

    const data = await res.json();

    // Return the data with success flag
    json(200, {
      success: true,
      ...data,
    });
  } catch (err) {
    console.error('[Transcription API] Error:', err);
    json(500, {
      success: false,
      error: `Failed to fetch transcription: ${err instanceof Error ? err.message : 'Unknown error'}`,
    });
  }
};
