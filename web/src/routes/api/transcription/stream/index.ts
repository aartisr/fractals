/**
 * Transcription Stream API - Proxy SSE from live translation service
 * GET /api/transcription/stream?streamId={id}&language={en}
 *
 * Note: This is a server-side proxy for SSE streaming of live transcriptions
 */

import type { RequestHandler } from '@builder.io/qwik-city';

export const onGet: RequestHandler = async ({ query, getWritableStream, env, headers }) => {
  const transcriptionServiceUrl = env.get('TRANSCRIPTION_API_URL') || 'http://live-translation-api:8090';
  const streamId = query.get('streamId');
  const language = query.get('language') || 'en';

  if (!streamId) {
    throw new Error('streamId query parameter is required');
  }

  try {
    // Set SSE response headers for the client connection
    headers.set('Content-Type', 'text/event-stream');
    headers.set('Cache-Control', 'no-cache, no-transform');
    headers.set('Connection', 'keep-alive');

    // Forward SSE request to transcription service
    const url = `${transcriptionServiceUrl}/transcription/${encodeURIComponent(streamId)}/stream?language=${encodeURIComponent(language)}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'text/event-stream',
        'Cache-Control': 'no-cache',
      },
    });

    if (!response.ok) {
      throw new Error(`Transcription service returned ${response.status}`);
    }

    if (!response.body) {
      throw new Error('No response body from transcription service');
    }

    // Get writable stream and pipe the response
    const stream = getWritableStream();
    const writer = stream.getWriter();
    const reader = response.body.getReader();
    const encoder = new TextEncoder();

    // Send an initial comment to establish the stream
    await writer.write(encoder.encode(': connected\n\n'));

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        await writer.write(value);
      }
    } finally {
      reader.releaseLock();
      writer.close();
    }
  } catch (err) {
    console.error('[Transcription Stream API] Error:', err);
    throw err;
  }
};
