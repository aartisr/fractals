/**
 * Transcription Languages API - Gets available languages for a stream
 * GET /api/transcription/languages?streamId={id}
 */

import type { RequestHandler } from '@builder.io/qwik-city';
import { getEnv } from '~/utils/env';

export const onGet: RequestHandler = async ({ query, json }) => {
  const streamId = query.get('streamId');

  if (!streamId) {
    json(400, {
      success: false,
      error: 'streamId query parameter is required',
    });
    return;
  }

  try {
    // Get transcription service URL from environment
    const base = getEnv('TRANSCRIPTION_API_URL') ||
      'http://live-translation-api:8090';

    const url = `${base}/transcription/${encodeURIComponent(streamId)}/languages`;

    const res = await fetch(url);

    if (!res.ok) {
      console.error('[Transcription Languages API] Service error:', res.status, res.statusText);
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
    console.error('[Transcription Languages API] Error:', err);
    json(500, {
      success: false,
      error: `Failed to fetch languages: ${err instanceof Error ? err.message : 'Unknown error'}`,
    });
  }
};
