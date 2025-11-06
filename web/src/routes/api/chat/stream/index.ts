/**
 * Chat Stream API - Proxy SSE from chat service
 * GET /api/chat/stream?streamId={id}
 *
 * Note: This is a server-side proxy for SSE streaming
 */

import type { RequestHandler } from '@builder.io/qwik-city';

export const onGet: RequestHandler = async ({ query, getWritableStream, env, cookie, error, headers }) => {
  const chatServiceUrl = env.get('CHAT_SERVICE_URL');
  const streamId = query.get('streamId');
  const token = cookie.get('nandi_session_token')?.value;

  if (!chatServiceUrl) {
    throw new Error('Chat service not configured');
  }

  if (!streamId) {
    throw new Error('streamId query parameter is required');
  }

  if (!token) {
    throw error(401, 'Unauthorized');
  }

  try {
    // Set SSE response headers for the client connection
    headers.set('Content-Type', 'text/event-stream');
    headers.set('Cache-Control', 'no-cache, no-transform');
    headers.set('Connection', 'keep-alive');

    // Forward SSE request to chat service
    const url = `${chatServiceUrl}/chat/stream?streamId=${encodeURIComponent(streamId)}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Chat service returned ${response.status}`);
    }

    if (!response.body) {
      throw new Error('No response body from chat service');
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
    console.error('[Chat Stream API] Error:', err);
    throw err;
  }
};
